const Joi = require('joi');
const RlsPolicy = require('../models/rlsPolicy.model');
const Tenant = require('../models/tenant.model');
const Role = require('../models/role.model');

const VALID_OPERATORS = ['IN', 'NOT IN', '=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IS NULL', 'IS NOT NULL', 'BETWEEN'];

const rlsPolicySchema = Joi.object({
  tenant_id: Joi.string().uuid().required(),
  role_id: Joi.string().uuid().required(),
  table_name: Joi.string().min(1).max(255).required(),
  column_name: Joi.string().min(1).max(255).optional().allow(null),
  condition_operator: Joi.string().valid(...VALID_OPERATORS).optional(),
  condition_value: Joi.alternatives()
    .try(
      Joi.array(),
      Joi.string(),
      Joi.number(),
      Joi.boolean(),
      Joi.object()
    ).optional().allow(null),
  custom_condition: Joi.string().optional().allow(null, ''),
  is_enabled: Joi.boolean().optional(),
  priority: Joi.number().integer().optional(),
  description: Joi.string().optional().allow(null, ''),
}).xor('custom_condition', 'column_name');

class RlsPolicyService {
  static async getAll(filters = {}) {
    return await RlsPolicy.findAll(filters);
  }

  static async getById(id) {
    const policy = await RlsPolicy.findById(id);
    if (!policy) {
      throw new Error('Policy not found');
    }
    return policy;
  }

  static async create(data) {
    const { error, value } = rlsPolicySchema.validate(data);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    if (!value.custom_condition && !value.column_name) {
      throw new Error('Either custom_condition or column_name must be provided');
    }

    if (value.custom_condition && value.condition_operator) {
      throw new Error('Cannot use condition_operator with custom_condition');
    }

    if (!value.custom_condition && !value.condition_operator) {
      throw new Error('condition_operator is required when using column_name');
    }

    const tenant = await Tenant.findById(value.tenant_id);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const role = await Role.findById(value.role_id);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.tenant_id !== value.tenant_id) {
      throw new Error('Role must belong to the specified tenant');
    }

    return await RlsPolicy.create(value);
  }

  static async update(id, data) {
    const updateSchema = Joi.object({
      tenant_id: Joi.string().uuid().optional(),
      role_id: Joi.string().uuid().optional(),
      table_name: Joi.string().min(1).max(255).optional(),
      column_name: Joi.string().min(1).max(255).optional().allow(null),
      condition_operator: Joi.string().valid(...VALID_OPERATORS).optional().allow(null),
      condition_value: Joi.alternatives()
        .try(
          Joi.array(),
          Joi.string(),
          Joi.number(),
          Joi.boolean(),
          Joi.object()
        ).optional().allow(null),
      custom_condition: Joi.string().optional().allow(null, ''),
      is_enabled: Joi.boolean().optional(),
      priority: Joi.number().integer().optional(),
      description: Joi.string().optional().allow(null, ''),
    }).min(1);

    const { error, value } = updateSchema.validate(data);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    const policy = await RlsPolicy.findById(id);
    if (!policy) {
      throw new Error('Policy not found');
    }

    return await RlsPolicy.update(id, value);
  }

  static async delete(id) {
    const policy = await RlsPolicy.findById(id);
    if (!policy) {
      throw new Error('Policy not found');
    }
    return await RlsPolicy.delete(id);
  }

  static async toggleEnabled(id, isEnabled) {
    const policy = await RlsPolicy.findById(id);
    if (!policy) {
      throw new Error('Policy not found');
    }
    return await RlsPolicy.toggleEnabled(id, isEnabled);
  }

  static async getPoliciesForUser(userId, tableName) {
    const roles = await Role.findByUserId(userId);
    const roleIds = roles.map(r => r.id);
    return await RlsPolicy.findByRoleIdsAndTable(roleIds, tableName);
  }
}

module.exports = RlsPolicyService;
