const { Parser } = require('node-sql-parser');
const ConditionBuilder = require('./conditionBuilder');

const parser = new Parser();

class SqlRewriter {
  constructor(options = {}) {
    this.options = {
      dialect: options.dialect || 'PostgreSQL',
    };
  }

  parse(sql) {
    try {
      const ast = parser.astify(sql, { database: this.options.dialect });
      return ast;
    } catch (err) {
      throw new Error(`SQL parse error: ${err.message}`);
    }
  }

  astToSql(ast) {
    try {
      return parser.sqlify(ast, { database: this.options.dialect });
    } catch (err) {
      throw new Error(`SQL generation error: ${err.message}`);
    }
  }

  extractTableNames(ast) {
    const tables = new Set();

    const walkNode = (node) => {
      if (!node || typeof node !== 'object') return;

      if (node.table) {
        if (Array.isArray(node.table)) {
          node.table.forEach(t => {
            if (t.table) tables.add(t.table);
          });
        } else if (typeof node.table === 'string') {
          tables.add(node.table);
        } else if (node.table.table) {
          tables.add(node.table.table);
        }
      }

      if (node.from) {
        if (Array.isArray(node.from)) {
          node.from.forEach(f => {
            if (f.table) tables.add(f.table);
          });
        } else if (node.from.table) {
          tables.add(node.from.table);
        }
      }

      if (node.where) walkNode(node.where);
      if (node.select) walkNode(node.select);
      if (node.union) {
        walkNode(node.union);
      }

      Object.keys(node).forEach(key => {
        const value = node[key];
        if (Array.isArray(value)) {
          value.forEach(v => walkNode(v));
        } else if (typeof value === 'object' && value !== null) {
          walkNode(value);
        }
      });
    };

    const handleAst = (astNode) => {
      if (Array.isArray(astNode)) {
        astNode.forEach(n => walkNode(n));
      } else {
        walkNode(astNode);
      }
    };

    handleAst(ast);
    return Array.from(tables);
  }

  getTableAliasMap(ast) {
    const aliasMap = {};

    const walkFrom = (fromNode) => {
      if (!fromNode) return;

      if (Array.isArray(fromNode)) {
        fromNode.forEach(f => walkFrom(f));
        return;
      }

      if (fromNode.table && fromNode.as) {
        aliasMap[fromNode.as] = fromNode.table;
      }
      if (fromNode.table && !fromNode.as) {
        aliasMap[fromNode.table] = fromNode.table;
      }

      if (fromNode.join) {
        walkFrom(fromNode.join);
      }
    };

    const handleAst = (astNode) => {
      if (Array.isArray(astNode)) {
        astNode.forEach(n => {
          if (n.from) walkFrom(n.from);
          if (n.table) walkFrom(n.table);
        });
      } else {
        if (astNode.from) walkFrom(astNode.from);
        if (astNode.table) walkFrom(astNode.table);
      }
    };

    handleAst(ast);
    return aliasMap;
  }

  applyPoliciesToAst(ast, policiesByTable) {
    const aliasMap = this.getTableAliasMap(ast);
    const allTables = this.extractTableNames(ast);

    const applyWhereCondition = (node, tables) => {
      if (!node) return;

      const conditions = [];
      tables.forEach(table => {
        const tablePolicies = policiesByTable[table] || [];
        tablePolicies.forEach(policy => {
          let condition = ConditionBuilder.buildConditionFromPolicy(policy);
          const aliases = Object.entries(aliasMap)
            .filter(([alias, realTable]) => realTable === table)
            .map(([alias]) => alias);

          if (aliases.length > 0 && policy.column_name) {
            aliases.forEach(alias => {
              if (alias !== table) {
                const aliasedCondition = condition.replace(
                  new RegExp(`\\b${policy.column_name}\\b`, 'g'),
                  `${alias}.${policy.column_name}`
                );
                conditions.push(aliasedCondition);
              }
            });
          }
          conditions.push(condition);
        });
      });

      const combinedCondition = ConditionBuilder.combineConditions(conditions);
      if (!combinedCondition) return;

      const rlsWhere = this.parse(`SELECT 1 WHERE ${combinedCondition}`);
      const rlsCondition = Array.isArray(rlsWhere) ? rlsWhere[0].where : rlsWhere.where;

      if (node.where) {
        node.where = {
          type: 'binary_expr',
          operator: 'AND',
          left: node.where,
          right: rlsCondition,
        };
      } else {
        node.where = rlsCondition;
      }
    };

    const processStatement = (stmt) => {
      if (!stmt) return;

      const type = stmt.type || '';

      if (type === 'select' || type === 'update' || type === 'delete') {
        const stmtTables = this.extractTableNames(stmt);
        const relevantTables = stmtTables.filter(t => policiesByTable[t]);
        if (relevantTables.length > 0) {
          applyWhereCondition(stmt, relevantTables);
        }
      }

      if (stmt.union) {
        processStatement(stmt.union);
      }

      if (stmt.from) {
        const processFrom = (from) => {
          if (Array.isArray(from)) {
            from.forEach(f => processFrom(f));
            return;
          }
          if (from.expr && from.expr.type === 'select') {
            processStatement(from.expr);
          }
          if (from.join) {
            processFrom(from.join);
          }
        };
        processFrom(stmt.from);
      }

      if (stmt.where) {
        const walkExpr = (expr) => {
          if (!expr || typeof expr !== 'object') return;
          if (expr.type === 'select') {
            processStatement(expr);
          }
          Object.keys(expr).forEach(key => {
            const val = expr[key];
            if (Array.isArray(val)) val.forEach(v => walkExpr(v));
            else if (typeof val === 'object') walkExpr(val);
          });
        };
        walkExpr(stmt.where);
      }
    };

    if (Array.isArray(ast)) {
      ast.forEach(stmt => processStatement(stmt));
    } else {
      processStatement(ast);
    }

    return ast;
  }

  rewrite(sql, policies) {
    if (!sql || typeof sql !== 'string') {
      throw new Error('SQL must be a non-empty string');
    }

    if (!policies || policies.length === 0) {
      return sql;
    }

    const policiesByTable = {};
    policies.forEach(p => {
      if (!policiesByTable[p.table_name]) {
        policiesByTable[p.table_name] = [];
      }
      policiesByTable[p.table_name].push(p);
    });

    const ast = this.parse(sql);
    const modifiedAst = this.applyPoliciesToAst(ast, policiesByTable);
    const rewrittenSql = this.astToSql(modifiedAst);

    return rewrittenSql;
  }
}

module.exports = SqlRewriter;
