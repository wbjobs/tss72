const { query } = require('../database/db');

class RlsPolicy {
  static async findAll(filters = {}) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (filters.tenant_id) {
      conditions.push(`tenant_id = $${paramIndex}`);
      params.push(filters.tenant_id);
      paramIndex++;
    }
    if (filters.role_id) {
      conditions.push(`role_id = $${paramIndex}`);
      params.push(filters.role_id);
      paramIndex++;
    }
    if (filters.table_name) {
      conditions.push(`table_name = $${paramIndex}`);
      params.push(filters.table_name);
      paramIndex++;
    }
    if (filters.is_enabled !== undefined) {
      conditions.push(`is_enabled = $${paramIndex}`);
      params.push(filters.is_enabled);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? 'WHERE ' + conditions.join(' AND ') 
      : '';

    const result = await query(
      `SELECT * FROM rls_policies ${whereClause} ORDER BY priority DESC, created_at DESC`,
      params
    );
    return result.rows;
  }

  static async findByRoleIdsAndTable(roleIds, tableName) {
    if (!roleIds || roleIds.length === 0) return [];
    
    const placeholders = roleIds.map((_, i) => `$${i + 1}`).join(',');
    const params = [...roleIds, tableName];
    
    const result = await query(
      `SELECT * FROM rls_policies 
       WHERE role_id IN (${placeholders}) 
         AND table_name = $${roleIds.length + 1}
         AND is_enabled = true
       ORDER BY priority DESC`,
      params
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM rls_policies WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async create(policyData) {
    const {
      tenant_id,
      role_id,
      table_name,
      column_name,
      condition_operator,
      condition_value,
      custom_condition,
      is_enabled,
      priority,
      description,
    } = policyData;

    const result = await query(
      `INSERT INTO rls_policies 
       (tenant_id, role_id, table_name, column_name, condition_operator, 
        condition_value, custom_condition, is_enabled, priority, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        tenant_id,
        role_id,
        table_name,
        column_name,
        condition_operator || 'IN',
        condition_value ? JSON.stringify(condition_value) : null,
        custom_condition,
        is_enabled !== undefined ? is_enabled : true,
        priority || 0,
        description,
      ]
    );
    return result.rows[0];
  }

  static async update(id, policyData) {
    const {
      table_name,
      column_name,
      condition_operator,
      condition_value,
      custom_condition,
      is_enabled,
      priority,
      description,
    } = policyData;

    const result = await query(
      `UPDATE rls_policies 
       SET table_name = COALESCE($1, table_name),
           column_name = COALESCE($2, column_name),
           condition_operator = COALESCE($3, condition_operator),
           condition_value = COALESCE($4, condition_value),
           custom_condition = COALESCE($5, custom_condition),
           is_enabled = COALESCE($6, is_enabled),
           priority = COALESCE($7, priority),
           description = COALESCE($8, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        table_name,
        column_name,
        condition_operator,
        condition_value ? JSON.stringify(condition_value) : null,
        custom_condition,
        is_enabled,
        priority,
        description,
        id,
      ]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query(
      'DELETE FROM rls_policies WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async toggleEnabled(id, isEnabled) {
    const result = await query(
      `UPDATE rls_policies 
       SET is_enabled = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [isEnabled, id]
    );
    return result.rows[0];
  }
}

module.exports = RlsPolicy;
