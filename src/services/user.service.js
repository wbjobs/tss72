const Joi = require('joi');
const User = require('../models/user.model');
const Tenant = require('../models/tenant.model');
const Role = require('../models/role.model');

const userSchema = Joi.object({
  username: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().allow(null, '').optional(),
  is_active: Joi.boolean().optional(),
});

class UserService {
  static async getAll(tenantId) {
    return await User.findAll(tenantId);
  }

  static async getById(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  static async create(tenantId, data) {
    const { error, value } = userSchema.validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const existing = await User.findByUsername(tenantId, value.username);
    if (existing) {
      throw new Error('User with this username already exists in tenant');
    }

    return await User.create({ ...value, tenant_id: tenantId });
  }

  static async update(id, data) {
    const { error, value } = userSchema.keys({
      username: Joi.string().min(1).max(100).optional(),
    }).validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }

    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    return await User.update(id, value);
  }

  static async delete(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return await User.delete(id);
  }

  static async assignRole(userId, roleId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const role = await Role.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    if (user.tenant_id !== role.tenant_id) {
      throw new Error('User and role must belong to the same tenant');
    }

    await User.assignRole(userId, roleId);
    return { success: true, message: 'Role assigned successfully' };
  }

  static async removeRole(userId, roleId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await User.removeRole(userId, roleId);
    return { success: true, message: 'Role removed successfully' };
  }

  static async getRoles(userId) {
    return await User.getRoles(userId);
  }
}

module.exports = UserService;
