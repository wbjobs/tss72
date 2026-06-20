const { query } = require('../database/db');

class User {
  static async findAll(tenantId) {
    const result = await query(
      'SELECT * FROM users WHERE tenant_id = $1 ORDER BY username',
      [tenantId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findByUsername(tenantId, username) {
    const result = await query(
      'SELECT * FROM users WHERE tenant_id = $1 AND username = $2',
      [tenantId, username]
    );
    return result.rows[0];
  }

  static async create({ tenant_id, username, email }) {
    const result = await query(
      'INSERT INTO users (tenant_id, username, email) VALUES ($1, $2, $3) RETURNING *',
      [tenant_id, username, email]
    );
    return result.rows[0];
  }

  static async update(id, { username, email, is_active }) {
    const result = await query(
      `UPDATE users 
       SET username = COALESCE($1, username),
           email = COALESCE($2, email),
           is_active = COALESCE($3, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [username, email, is_active, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async assignRole(userId, roleId) {
    await query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, roleId]
    );
  }

  static async removeRole(userId, roleId) {
    await query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );
  }

  static async getRoles(userId) {
    const result = await query(
      `SELECT r.* FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return result.rows;
  }
}

module.exports = User;
