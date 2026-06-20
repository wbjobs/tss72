const { query } = require('../database/db');

class Tenant {
  static async findAll() {
    const result = await query(
      'SELECT * FROM tenants ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM tenants WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findByName(name) {
    const result = await query(
      'SELECT * FROM tenants WHERE name = $1',
      [name]
    );
    return result.rows[0];
  }

  static async create({ name, description }) {
    const result = await query(
      'INSERT INTO tenants (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    return result.rows[0];
  }

  static async update(id, { name, description, is_active }) {
    const result = await query(
      `UPDATE tenants 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_active = COALESCE($3, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, description, is_active, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query(
      'DELETE FROM tenants WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = Tenant;
