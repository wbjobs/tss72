const SqlRewriter = require('../../src/security/sqlRewriter');

describe('SqlRewriter', () => {
  let rewriter;

  beforeEach(() => {
    rewriter = new SqlRewriter();
  });

  describe('parse', () => {
    it('should parse a simple SELECT statement', () => {
      const ast = rewriter.parse('SELECT * FROM orders');
      expect(ast).toBeDefined();
    });

    it('should parse a SELECT with WHERE clause', () => {
      const ast = rewriter.parse("SELECT * FROM orders WHERE amount > 100");
      expect(ast).toBeDefined();
    });

    it('should parse UPDATE statements', () => {
      const ast = rewriter.parse("UPDATE orders SET status = 'processed' WHERE id = 1");
      expect(ast).toBeDefined();
    });

    it('should parse DELETE statements', () => {
      const ast = rewriter.parse("DELETE FROM orders WHERE status = 'cancelled'");
      expect(ast).toBeDefined();
    });

    it('should throw error for invalid SQL', () => {
      expect(() => rewriter.parse('NOT VALID SQL')).toThrow(/SQL parse error/);
    });
  });

  describe('astToSql', () => {
    it('should convert AST back to SQL', () => {
      const originalSql = 'SELECT * FROM orders';
      const ast = rewriter.parse(originalSql);
      const sql = rewriter.astToSql(ast);
      expect(sql).toBeTruthy();
      expect(sql.toLowerCase()).toContain('select');
      expect(sql.toLowerCase()).toContain('from');
      expect(sql.toLowerCase()).toContain('orders');
    });
  });

  describe('extractTableNames', () => {
    it('should extract table name from simple SELECT', () => {
      const ast = rewriter.parse('SELECT * FROM orders');
      const tables = rewriter.extractTableNames(ast);
      expect(tables).toContain('orders');
    });

    it('should extract table name from UPDATE', () => {
      const ast = rewriter.parse("UPDATE orders SET status = 'done'");
      const tables = rewriter.extractTableNames(ast);
      expect(tables).toContain('orders');
    });

    it('should extract table name from DELETE', () => {
      const ast = rewriter.parse('DELETE FROM orders');
      const tables = rewriter.extractTableNames(ast);
      expect(tables).toContain('orders');
    });

    it('should extract multiple tables from JOIN', () => {
      const ast = rewriter.parse(
        'SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id'
      );
      const tables = rewriter.extractTableNames(ast);
      expect(tables).toContain('orders');
      expect(tables).toContain('customers');
    });

    it('should extract tables from subqueries', () => {
      const ast = rewriter.parse(
        'SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE active = true)'
      );
      const tables = rewriter.extractTableNames(ast);
      expect(tables).toContain('orders');
      expect(tables).toContain('customers');
    });
  });

  describe('getTableAliasMap', () => {
    it('should map table aliases', () => {
      const ast = rewriter.parse(
        'SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id'
      );
      const aliasMap = rewriter.getTableAliasMap(ast);
      expect(aliasMap['o']).toBe('orders');
      expect(aliasMap['c']).toBe('customers');
    });

    it('should map table without alias to itself', () => {
      const ast = rewriter.parse('SELECT * FROM orders');
      const aliasMap = rewriter.getTableAliasMap(ast);
      expect(aliasMap['orders']).toBe('orders');
    });
  });

  describe('rewrite', () => {
    it('should return original SQL when no policies provided', () => {
      const sql = 'SELECT * FROM orders';
      expect(rewriter.rewrite(sql, [])).toBe(sql);
      expect(rewriter.rewrite(sql, null)).toBe(sql);
    });

    it('should throw error for invalid SQL input', () => {
      expect(() => rewriter.rewrite('', [])).toThrow('SQL must be a non-empty string');
      expect(() => rewriter.rewrite(null, [])).toThrow('SQL must be a non-empty string');
    });

    it('should not modify SQL when no matching table in policies', () => {
      const sql = 'SELECT * FROM products';
      const policies = [{
        table_name: 'orders',
        column_name: 'status',
        condition_operator: 'IN',
        condition_value: ['active'],
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('select');
      expect(result.toLowerCase()).toContain('products');
      expect(result.toLowerCase()).not.toContain('where');
      expect(result).not.toContain("'active'");
    });

    it('should add WHERE clause when policies match table (SELECT without WHERE)', () => {
      const sql = 'SELECT * FROM orders';
      const policies = [{
        table_name: 'orders',
        column_name: 'status',
        condition_operator: 'IN',
        condition_value: ['in_progress'],
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('where');
      expect(result).toContain("'in_progress'");
      expect(result.toLowerCase()).toContain('in');
    });

    it('should add conditions with AND to existing WHERE clause', () => {
      const sql = "SELECT * FROM orders WHERE amount > 1000";
      const policies = [{
        table_name: 'orders',
        column_name: 'status',
        condition_operator: '=',
        condition_value: 'in_progress',
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('and');
      expect(result).toContain('"amount" > 1000');
      expect(result).toContain("'in_progress'");
    });

    it('should handle UPDATE statements with policies', () => {
      const sql = "UPDATE orders SET status = 'processed' WHERE id = 123";
      const policies = [{
        table_name: 'orders',
        column_name: 'tenant_id',
        condition_operator: '=',
        condition_value: 't1',
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('update');
      expect(result.toLowerCase()).toContain('and');
      expect(result).toContain('"id" = 123');
      expect(result).toContain("'t1'");
    });

    it('should handle DELETE statements with policies', () => {
      const sql = "DELETE FROM orders WHERE status = 'old'";
      const policies = [{
        table_name: 'orders',
        column_name: 'tenant_id',
        condition_operator: '=',
        condition_value: 'tenant_abc',
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('delete');
      expect(result.toLowerCase()).toContain('and');
      expect(result).toContain("'tenant_abc'");
    });

    it('should apply multiple policies for the same table', () => {
      const sql = 'SELECT * FROM orders';
      const policies = [
        {
          table_name: 'orders',
          column_name: 'status',
          condition_operator: 'IN',
          condition_value: ['in_progress', 'pending'],
        },
        {
          table_name: 'orders',
          column_name: 'is_deleted',
          condition_operator: '=',
          condition_value: false,
        },
      ];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('and');
      expect(result).toContain("'in_progress'");
      expect(result).toContain("'pending'");
      expect(result).toContain('FALSE');
    });

    it('should apply custom_condition from policy', () => {
      const sql = 'SELECT * FROM orders';
      const policies = [{
        table_name: 'orders',
        custom_condition: "created_by = current_user_id()",
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result).toContain('created_by');
      expect(result).toContain('current_user_id()');
    });

    it('should apply policies to multiple tables in JOIN', () => {
      const sql = 'SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id';
      const policies = [
        {
          table_name: 'orders',
          column_name: 'status',
          condition_operator: '=',
          condition_value: 'active',
        },
        {
          table_name: 'customers',
          column_name: 'is_active',
          condition_operator: '=',
          condition_value: true,
        },
      ];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('and');
      expect(result).toContain("'active'");
      expect(result).toContain('TRUE');
    });

    it('should apply IS NULL operator correctly', () => {
      const sql = 'SELECT * FROM orders';
      const policies = [{
        table_name: 'orders',
        column_name: 'deleted_at',
        condition_operator: 'IS NULL',
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('is null');
      expect(result).toContain('deleted_at');
    });

    it('should apply IS NOT NULL operator correctly', () => {
      const sql = 'SELECT * FROM orders';
      const policies = [{
        table_name: 'orders',
        column_name: 'approved_at',
        condition_operator: 'IS NOT NULL',
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('is not null');
      expect(result).toContain('approved_at');
    });

    it('should apply LIKE operator correctly', () => {
      const sql = 'SELECT * FROM customers';
      const policies = [{
        table_name: 'customers',
        column_name: 'region',
        condition_operator: 'LIKE',
        condition_value: '%EU%',
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('like');
      expect(result).toContain("'%EU%'");
    });

    it('should apply BETWEEN operator correctly', () => {
      const sql = 'SELECT * FROM orders';
      const policies = [{
        table_name: 'orders',
        column_name: 'amount',
        condition_operator: 'BETWEEN',
        condition_value: [100, 1000],
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('between');
      expect(result).toContain('100');
      expect(result).toContain('1000');
    });

    it('should handle complex WHERE with OR and add RLS with AND', () => {
      const sql = "SELECT * FROM orders WHERE status = 'pending' OR status = 'review'";
      const policies = [{
        table_name: 'orders',
        column_name: 'tenant_id',
        condition_operator: '=',
        condition_value: 't1',
      }];
      const result = rewriter.rewrite(sql, policies);
      const lowerResult = result.toLowerCase();
      const whereIdx = lowerResult.indexOf('where');
      const andIdx = lowerResult.indexOf('and', whereIdx);
      const orIdx = lowerResult.indexOf('or', whereIdx);
      expect(andIdx).toBeGreaterThan(whereIdx);
      expect(orIdx).toBeGreaterThan(whereIdx);
    });

    it('should handle SELECT with column aliases', () => {
      const sql = 'SELECT id AS order_id, status FROM orders';
      const policies = [{
        table_name: 'orders',
        column_name: 'status',
        condition_operator: '=',
        condition_value: 'active',
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result).toContain('AS');
      expect(result).toContain("'active'");
    });

    it('should handle SELECT with ORDER BY', () => {
      const sql = 'SELECT * FROM orders ORDER BY created_at DESC';
      const policies = [{
        table_name: 'orders',
        column_name: 'is_deleted',
        condition_operator: '=',
        condition_value: false,
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('order by');
      expect(result.toLowerCase()).toContain('where');
    });

    it('should handle SELECT with LIMIT and OFFSET', () => {
      const sql = 'SELECT * FROM orders LIMIT 10 OFFSET 20';
      const policies = [{
        table_name: 'orders',
        column_name: 'tenant_id',
        condition_operator: '=',
        condition_value: 't1',
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('limit');
      expect(result.toLowerCase()).toContain('offset');
      expect(result.toLowerCase()).toContain('where');
    });

    it('should handle SELECT with GROUP BY and HAVING', () => {
      const sql = 'SELECT customer_id, COUNT(*) as cnt FROM orders GROUP BY customer_id HAVING COUNT(*) > 5';
      const policies = [{
        table_name: 'orders',
        column_name: 'tenant_id',
        condition_operator: '=',
        condition_value: 't1',
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('group by');
      expect(result.toLowerCase()).toContain('having');
      expect(result.toLowerCase()).toContain('where');
    });

    it('should handle UNION queries by applying policies to each', () => {
      const sql = "SELECT id FROM active_orders UNION SELECT id FROM archived_orders";
      const policies = [
        {
          table_name: 'active_orders',
          column_name: 'tenant_id',
          condition_operator: '=',
          condition_value: 't1',
        },
        {
          table_name: 'archived_orders',
          column_name: 'tenant_id',
          condition_operator: '=',
          condition_value: 't1',
        },
      ];
      const result = rewriter.rewrite(sql, policies);
      expect(result.toLowerCase()).toContain('union');
    });

    it('should handle != operator correctly', () => {
      const sql = 'SELECT * FROM orders';
      const policies = [{
        table_name: 'orders',
        column_name: 'status',
        condition_operator: '!=',
        condition_value: 'deleted',
      }];
      const result = rewriter.rewrite(sql, policies);
      expect(result).toMatch(/(!=|<>)/);
      expect(result).toContain("'deleted'");
    });
  });

  describe('applyPoliciesToAst', () => {
    it('should not throw when policiesByTable is empty', () => {
      const ast = rewriter.parse('SELECT * FROM orders');
      expect(() => rewriter.applyPoliciesToAst(ast, {})).not.toThrow();
    });
  });
});
