const { getClient } = require('../database/db');
const SqlRewriter = require('./sqlRewriter');
const Role = require('../models/role.model');
const RlsPolicy = require('../models/rlsPolicy.model');

const sqlRewriter = new SqlRewriter();

class SecureQueryExecutor {
  constructor(userId, options = {}) {
    this.userId = userId;
    this.options = {
      tenantId: options.tenantId || null,
      bypassRls: options.bypassRls || false,
      logQueries: options.logQueries || process.env.NODE_ENV !== 'production',
    };
    this._policiesCache = null;
    this._rolesCache = null;
  }

  async _getUserRoles() {
    if (this._rolesCache !== null) {
      return this._rolesCache;
    }
    this._rolesCache = await Role.findByUserId(this.userId);
    return this._rolesCache;
  }

  async _getApplicablePolicies(tableNames) {
    if (this.options.bypassRls) {
      return [];
    }

    const roles = await this._getUserRoles();
    if (roles.length === 0) {
      return [];
    }

    const roleIds = roles.map(r => r.id);
    const allPolicies = [];

    for (const tableName of tableNames) {
      const tablePolicies = await RlsPolicy.findByRoleIdsAndTable(roleIds, tableName);
      allPolicies.push(...tablePolicies);
    }

    return allPolicies;
  }

  async _rewriteSql(sql) {
    if (this.options.bypassRls) {
      return sql;
    }

    try {
      const ast = sqlRewriter.parse(sql);
      const tableNames = sqlRewriter.extractTableNames(ast);

      if (tableNames.length === 0) {
        return sql;
      }

      const policies = await this._getApplicablePolicies(tableNames);

      if (policies.length === 0) {
        return sql;
      }

      const rewrittenSql = sqlRewriter.rewrite(sql, policies);

      if (this.options.logQueries) {
        console.log('[RLS] Original SQL:', sql.trim());
        console.log('[RLS] Rewritten SQL:', rewrittenSql.trim());
      }

      return rewrittenSql;
    } catch (err) {
      console.warn('[RLS] SQL rewriting failed, executing original:', err.message);
      return sql;
    }
  }

  async query(sql, params = []) {
    const client = await getClient();
    try {
      const rewrittenSql = await this._rewriteSql(sql);
      return await client.query(rewrittenSql, params);
    } finally {
      client.release();
    }
  }

  async queryWithPolicies(sql, policies, params = []) {
    const client = await getClient();
    try {
      const rewrittenSql = sqlRewriter.rewrite(sql, policies);
      if (this.options.logQueries) {
        console.log('[RLS] Original SQL:', sql.trim());
        console.log('[RLS] Rewritten SQL:', rewrittenSql.trim());
      }
      return await client.query(rewrittenSql, params);
    } finally {
      client.release();
    }
  }

  static createExecutor(userId, options) {
    return new SecureQueryExecutor(userId, options);
  }
}

async function secureQuery(userId, sql, params = [], options = {}) {
  const executor = new SecureQueryExecutor(userId, options);
  return await executor.query(sql, params);
}

module.exports = {
  SecureQueryExecutor,
  secureQuery,
};
