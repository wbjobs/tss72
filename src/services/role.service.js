const Joi = require('joi');
const Role = require('../models/role.model');
const Tenant = require('../models/tenant.model');

const roleSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().allow(null, '').optional(),
});

class RoleService {
  static async getAll(tenantId) {
    return await Role.findAll(tenantId);
  }

  static async getById(id) {
    const role = await Role.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }
    return role;
  }

  static async create(tenantId, data) {
    const { error, value } = roleSchema.validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const existing = await Role.findByName(tenantId, value.name);
    if (existing) {
      throw new Error('Role with this name already exists in tenant');
    }

    return await Role.create({ ...value, tenant_id: tenantId });
  }

  static async update(id, data) {
    const { error, value } = roleSchema.keys({
      name: Joi.string().min(1).max(100).optional(),
    }).validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }

    const role = await Role.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    return await Role.update(id, value);
  }

  static async delete(id) {
    const role = await Role.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }
    return await Role.delete(id);
  }
}

module.exports = RoleService;
