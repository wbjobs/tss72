const RlsPolicyService = require('../../src/services/rlsPolicy.service');

jest.mock('../../src/models/rlsPolicy.model', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByRoleIdsAndTable: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  toggleEnabled: jest.fn(),
}));

jest.mock('../../src/models/tenant.model', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/role.model', () => ({
  findById: jest.fn(),
  findByUserId: jest.fn(),
}));

const RlsPolicy = require('../../src/models/rlsPolicy.model');
const Tenant = require('../../src/models/tenant.model');
const Role = require('../../src/models/role.model');

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const ROLE_ID = '22222222-2222-2222-2222-222222222222';
const ROLE_ID_2 = '33333333-3333-3333-3333-333333333333';
const POLICY_ID = '44444444-4444-4444-4444-444444444444';
const USER_ID = '55555555-5555-5555-5555-555555555555';

describe('RlsPolicyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all policies', async () => {
      const mockPolicies = [
        { id: POLICY_ID, table_name: 'orders', column_name: 'status' },
        { id: 'p2', table_name: 'customers', column_name: 'region' },
      ];
      RlsPolicy.findAll.mockResolvedValue(mockPolicies);

      const result = await RlsPolicyService.getAll();
      expect(result).toEqual(mockPolicies);
      expect(RlsPolicy.findAll).toHaveBeenCalledWith({});
    });

    it('should pass filters to findAll', async () => {
      const filters = { tenant_id: TENANT_ID, is_enabled: true };
      RlsPolicy.findAll.mockResolvedValue([]);

      await RlsPolicyService.getAll(filters);
      expect(RlsPolicy.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('getById', () => {
    it('should return policy when found', async () => {
      const policy = { id: POLICY_ID, table_name: 'orders' };
      RlsPolicy.findById.mockResolvedValue(policy);

      const result = await RlsPolicyService.getById(POLICY_ID);
      expect(result).toEqual(policy);
    });

    it('should throw error when policy not found', async () => {
      RlsPolicy.findById.mockResolvedValue(null);

      await expect(RlsPolicyService.getById('00000000-0000-0000-0000-000000000000'))
        .rejects.toThrow('Policy not found');
    });
  });

  describe('create', () => {
    const validPolicy = {
      tenant_id: TENANT_ID,
      role_id: ROLE_ID,
      table_name: 'orders',
      column_name: 'status',
      condition_operator: '=',
      condition_value: 'active',
    };

    it('should create policy with valid data', async () => {
      Tenant.findById.mockResolvedValue({ id: TENANT_ID, name: 'tenant1' });
      Role.findById.mockResolvedValue({ id: ROLE_ID, tenant_id: TENANT_ID, name: 'role1' });
      RlsPolicy.create.mockResolvedValue({ id: POLICY_ID, ...validPolicy });

      const result = await RlsPolicyService.create(validPolicy);
      expect(result).toHaveProperty('id', POLICY_ID);
      expect(RlsPolicy.create).toHaveBeenCalled();
    });

    it('should support custom_condition instead of column_name', async () => {
      const policyWithCustom = {
        tenant_id: TENANT_ID,
        role_id: ROLE_ID,
        table_name: 'orders',
        custom_condition: "created_by = current_setting('app.current_user_id')::uuid",
      };
      Tenant.findById.mockResolvedValue({ id: TENANT_ID, name: 'tenant1' });
      Role.findById.mockResolvedValue({ id: ROLE_ID, tenant_id: TENANT_ID, name: 'role1' });
      RlsPolicy.create.mockResolvedValue({ id: POLICY_ID, ...policyWithCustom });

      const result = await RlsPolicyService.create(policyWithCustom);
      expect(result).toHaveProperty('id', POLICY_ID);
    });

    it('should throw error when neither custom_condition nor column_name', async () => {
      const invalid = {
        tenant_id: TENANT_ID,
        role_id: ROLE_ID,
        table_name: 'orders',
      };

      await expect(RlsPolicyService.create(invalid))
        .rejects.toThrow();
    });

    it('should throw error when tenant not found', async () => {
      Tenant.findById.mockResolvedValue(null);

      await expect(RlsPolicyService.create(validPolicy))
        .rejects.toThrow('Tenant not found');
    });

    it('should throw error when role not found', async () => {
      Tenant.findById.mockResolvedValue({ id: TENANT_ID });
      Role.findById.mockResolvedValue(null);

      await expect(RlsPolicyService.create(validPolicy))
        .rejects.toThrow('Role not found');
    });

    it('should throw error when role belongs to different tenant', async () => {
      Tenant.findById.mockResolvedValue({ id: TENANT_ID });
      Role.findById.mockResolvedValue({ id: ROLE_ID, tenant_id: '99999999-9999-9999-9999-999999999999' });

      await expect(RlsPolicyService.create(validPolicy))
        .rejects.toThrow('Role must belong to the specified tenant');
    });

    it('should throw error for invalid condition_operator', async () => {
      const invalid = {
        ...validPolicy,
        condition_operator: 'INVALID_OP',
      };

      await expect(RlsPolicyService.create(invalid))
        .rejects.toThrow(/Validation error/);
    });

    it('should throw error when column_name used without condition_operator', async () => {
      const invalid = {
        tenant_id: TENANT_ID,
        role_id: ROLE_ID,
        table_name: 'orders',
        column_name: 'status',
      };

      Tenant.findById.mockResolvedValue({ id: TENANT_ID });
      Role.findById.mockResolvedValue({ id: ROLE_ID, tenant_id: TENANT_ID });

      await expect(RlsPolicyService.create(invalid))
        .rejects.toThrow('condition_operator is required when using column_name');
    });
  });

  describe('update', () => {
    it('should update existing policy', async () => {
      const existing = { id: POLICY_ID, table_name: 'orders', priority: 0 };
      const updates = { priority: 10, description: 'Updated policy' };
      RlsPolicy.findById.mockResolvedValue(existing);
      RlsPolicy.update.mockResolvedValue({ ...existing, ...updates });

      const result = await RlsPolicyService.update(POLICY_ID, updates);
      expect(result.priority).toBe(10);
      expect(result.description).toBe('Updated policy');
    });

    it('should throw error when policy not found', async () => {
      RlsPolicy.findById.mockResolvedValue(null);

      await expect(RlsPolicyService.update('00000000-0000-0000-0000-000000000000', { priority: 1 }))
        .rejects.toThrow('Policy not found');
    });
  });

  describe('delete', () => {
    it('should delete existing policy', async () => {
      const policy = { id: POLICY_ID, table_name: 'orders' };
      RlsPolicy.findById.mockResolvedValue(policy);
      RlsPolicy.delete.mockResolvedValue(policy);

      const result = await RlsPolicyService.delete(POLICY_ID);
      expect(result).toEqual(policy);
    });

    it('should throw error when policy not found', async () => {
      RlsPolicy.findById.mockResolvedValue(null);

      await expect(RlsPolicyService.delete('00000000-0000-0000-0000-000000000000'))
        .rejects.toThrow('Policy not found');
    });
  });

  describe('toggleEnabled', () => {
    it('should enable a disabled policy', async () => {
      const policy = { id: POLICY_ID, is_enabled: false };
      RlsPolicy.findById.mockResolvedValue(policy);
      RlsPolicy.toggleEnabled.mockResolvedValue({ ...policy, is_enabled: true });

      const result = await RlsPolicyService.toggleEnabled(POLICY_ID, true);
      expect(result.is_enabled).toBe(true);
    });

    it('should throw error when policy not found', async () => {
      RlsPolicy.findById.mockResolvedValue(null);

      await expect(RlsPolicyService.toggleEnabled('00000000-0000-0000-0000-000000000000', true))
        .rejects.toThrow('Policy not found');
    });
  });

  describe('getPoliciesForUser', () => {
    it('should return policies for user roles and table', async () => {
      const mockRoles = [{ id: ROLE_ID }, { id: ROLE_ID_2 }];
      const mockPolicies = [
        { id: POLICY_ID, role_id: ROLE_ID, table_name: 'orders' },
      ];
      Role.findByUserId.mockResolvedValue(mockRoles);
      RlsPolicy.findByRoleIdsAndTable.mockResolvedValue(mockPolicies);

      const result = await RlsPolicyService.getPoliciesForUser(USER_ID, 'orders');
      expect(result).toEqual(mockPolicies);
      expect(RlsPolicy.findByRoleIdsAndTable)
        .toHaveBeenCalledWith([ROLE_ID, ROLE_ID_2], 'orders');
    });

    it('should return empty array when user has no roles', async () => {
      Role.findByUserId.mockResolvedValue([]);
      RlsPolicy.findByRoleIdsAndTable.mockResolvedValue([]);

      const result = await RlsPolicyService.getPoliciesForUser(USER_ID, 'orders');
      expect(result).toEqual([]);
    });
  });
});
