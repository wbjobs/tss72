const { query } = require('../database/db');

class Role {
  static async findAll(tenantId) {
    const result = await query(
      'SELECT * FROM roles WHERE tenant_id = $1 ORDER BY name',
      [tenantId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM roles WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findByName(tenantId, name) {
    const result = await query(
      'SELECT * FROM roles WHERE tenant_id = $1 AND name = $2',
      [tenantId, name]
    );
    return result.rows[0];
  }

  static async create({ tenant_id, name, description }) {
    const result = await query(
      'INSERT INTO roles (tenant_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [tenant_id, name, description]
    );
    return result.rows[0];
  }

  static async update(id, { name, description }) {
    const result = await query(
      `UPDATE roles 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [name, description, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query(
      'DELETE FROM roles WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await query(
      `SELECT r.* FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return result.rows;
  }
}

module.exports = Role;
