const Joi = require('joi');
const Tenant = require('../models/tenant.model');

const tenantSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().allow(null, '').optional(),
  is_active: Joi.boolean().optional(),
});

class TenantService {
  static async getAll() {
    return await Tenant.findAll();
  }

  static async getById(id) {
    const tenant = await Tenant.findById(id);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    return tenant;
  }

  static async create(data) {
    const { error, value } = tenantSchema.validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }

    const existing = await Tenant.findByName(value.name);
    if (existing) {
      throw new Error('Tenant with this name already exists');
    }

    return await Tenant.create(value);
  }

  static async update(id, data) {
    const { error, value } = tenantSchema.keys({
      name: Joi.string().min(1).max(255).optional(),
    }).validate(data);
    if (error) {
      throw new Error(error.details[0].message);
    }

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return await Tenant.update(id, value);
  }

  static async delete(id) {
    const tenant = await Tenant.findById(id);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    return await Tenant.delete(id);
  }
}

module.exports = TenantService;
