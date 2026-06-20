const app = require('../../src/app');
const request = require('supertest');

jest.mock('../../src/models/tenant.model', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('../../src/models/role.model', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('../../src/models/rlsPolicy.model', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByRoleIdsAndTable: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  toggleEnabled: jest.fn(),
}));

jest.mock('../../src/models/user.model', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUsername: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  assignRole: jest.fn(),
  removeRole: jest.fn(),
  getRoles: jest.fn(),
}));

const Tenant = require('../../src/models/tenant.model');
const Role = require('../../src/models/role.model');
const User = require('../../src/models/user.model');
const RlsPolicy = require('../../src/models/rlsPolicy.model');

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const ROLE_ID = '22222222-2222-2222-2222-222222222222';
const USER_ID = '55555555-5555-5555-5555-555555555555';

describe('API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('Tenants API', () => {
    describe('GET /api/tenants', () => {
      it('should return list of tenants', async () => {
        const mockTenants = [
          { id: TENANT_ID, name: 'Tenant A', description: 'First tenant' },
          { id: 't2', name: 'Tenant B', description: 'Second tenant' },
        ];
        Tenant.findAll.mockResolvedValue(mockTenants);

        const res = await request(app).get('/api/tenants');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].name).toBe('Tenant A');
      });
    });

    describe('POST /api/tenants', () => {
      it('should create a new tenant', async () => {
        const tenantData = { name: 'New Tenant', description: 'A new tenant' };
        Tenant.findByName.mockResolvedValue(null);
        Tenant.create.mockResolvedValue({ id: TENANT_ID, ...tenantData });

        const res = await request(app)
          .post('/api/tenants')
          .send(tenantData);
        expect(res.statusCode).toBe(201);
        expect(res.body.name).toBe('New Tenant');
      });

      it('should return 409 for duplicate tenant name', async () => {
        const tenantData = { name: 'Existing Tenant' };
        Tenant.findByName.mockResolvedValue({ id: TENANT_ID, name: 'Existing Tenant' });

        const res = await request(app)
          .post('/api/tenants')
          .send(tenantData);
        expect(res.statusCode).toBe(409);
      });

      it('should return 400 for missing name', async () => {
        const res = await request(app)
          .post('/api/tenants')
          .send({ description: 'No name' });
        expect(res.statusCode).toBe(400);
      });
    });

    describe('GET /api/tenants/:id', () => {
      it('should return tenant by id', async () => {
        Tenant.findById.mockResolvedValue({ id: TENANT_ID, name: 'Tenant A' });
        const res = await request(app).get(`/api/tenants/${TENANT_ID}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe(TENANT_ID);
      });

      it('should return 404 for non-existent tenant', async () => {
        Tenant.findById.mockResolvedValue(null);
        const res = await request(app).get('/api/tenants/00000000-0000-0000-0000-000000000000');
        expect(res.statusCode).toBe(404);
      });
    });
  });

  describe('Roles API', () => {
    describe('GET /api/tenants/:tenantId/roles', () => {
      it('should return roles for tenant', async () => {
        const mockRoles = [
          { id: ROLE_ID, tenant_id: TENANT_ID, name: 'admin' },
          { id: 'r2', tenant_id: TENANT_ID, name: 'sales' },
        ];
        Role.findAll.mockResolvedValue(mockRoles);

        const res = await request(app).get(`/api/tenants/${TENANT_ID}/roles`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(2);
      });
    });

    describe('POST /api/tenants/:tenantId/roles', () => {
      it('should create a new role', async () => {
        Tenant.findById.mockResolvedValue({ id: TENANT_ID, name: 'Tenant A' });
        Role.findByName.mockResolvedValue(null);
        Role.create.mockResolvedValue({
          id: ROLE_ID,
          tenant_id: TENANT_ID,
          name: 'manager',
          description: 'Manager role',
        });

        const res = await request(app)
          .post(`/api/tenants/${TENANT_ID}/roles`)
          .send({ name: 'manager', description: 'Manager role' });
        expect(res.statusCode).toBe(201);
        expect(res.body.name).toBe('manager');
      });
    });
  });

  describe('RLS Policies API', () => {
    describe('GET /api/policies', () => {
      it('should return all policies', async () => {
        const mockPolicies = [
          {
            id: 'p1',
            tenant_id: TENANT_ID,
            role_id: ROLE_ID,
            table_name: 'orders',
            column_name: 'status',
            condition_operator: '=',
            condition_value: 'active',
          },
        ];
        RlsPolicy.findAll.mockResolvedValue(mockPolicies);

        const res = await request(app).get('/api/policies');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
      });
    });

    describe('POST /api/tenants/:tenantId/policies', () => {
      it('should create a new RLS policy', async () => {
        const policyData = {
          role_id: ROLE_ID,
          table_name: 'orders',
          column_name: 'status',
          condition_operator: 'IN',
          condition_value: ['in_progress', 'pending'],
          description: 'Sales can only see active orders',
        };
        Tenant.findById.mockResolvedValue({ id: TENANT_ID });
        Role.findById.mockResolvedValue({ id: ROLE_ID, tenant_id: TENANT_ID });
        RlsPolicy.create.mockResolvedValue({
          id: 'p1',
          tenant_id: TENANT_ID,
          ...policyData,
        });

        const res = await request(app)
          .post(`/api/tenants/${TENANT_ID}/policies`)
          .send(policyData);
        expect(res.statusCode).toBe(201);
        expect(res.body.table_name).toBe('orders');
      });

      it('should create a policy with custom_condition', async () => {
        const policyData = {
          role_id: ROLE_ID,
          table_name: 'orders',
          custom_condition: "created_by = current_setting('app.user_id')::uuid",
        };
        Tenant.findById.mockResolvedValue({ id: TENANT_ID });
        Role.findById.mockResolvedValue({ id: ROLE_ID, tenant_id: TENANT_ID });
        RlsPolicy.create.mockResolvedValue({
          id: 'p1',
          tenant_id: TENANT_ID,
          ...policyData,
        });

        const res = await request(app)
          .post(`/api/tenants/${TENANT_ID}/policies`)
          .send(policyData);
        expect(res.statusCode).toBe(201);
        expect(res.body.custom_condition).toBeDefined();
      });
    });
  });

  describe('SQL Preview API', () => {
    describe('POST /api/sql/preview', () => {
      it('should preview SQL rewriting with given policies', async () => {
        const requestData = {
          sql: 'SELECT * FROM orders',
          policies: [{
            table_name: 'orders',
            column_name: 'status',
            condition_operator: '=',
            condition_value: 'in_progress',
          }],
        };

        const res = await request(app)
          .post('/api/sql/preview')
          .send(requestData);
        expect(res.statusCode).toBe(200);
        expect(res.body.original_sql).toBe('SELECT * FROM orders');
        expect(res.body.tables_involved).toContain('orders');
        expect(res.body.is_modified).toBe(true);
        expect(res.body.rewritten_sql).not.toBe(res.body.original_sql);
      });

      it('should return unmodified SQL when no policies match', async () => {
        const requestData = {
          sql: 'SELECT * FROM products',
          policies: [{
            table_name: 'orders',
            column_name: 'status',
            condition_operator: '=',
            condition_value: 'active',
          }],
        };

        const res = await request(app)
          .post('/api/sql/preview')
          .send(requestData);
        expect(res.statusCode).toBe(200);
        expect(res.body.tables_involved).toContain('products');
        expect(res.body.is_modified).toBe(false);
      });

      it('should handle preview with custom_condition policy', async () => {
        const requestData = {
          sql: 'SELECT * FROM orders',
          policies: [{
            table_name: 'orders',
            custom_condition: "tenant_id = 'tenant_123'",
          }],
        };

        const res = await request(app)
          .post('/api/sql/preview')
          .send(requestData);
        expect(res.statusCode).toBe(200);
        expect(res.body.is_modified).toBe(true);
        expect(res.body.rewritten_sql).toContain('tenant_123');
      });

      it('should return 400 for invalid SQL', async () => {
        const res = await request(app)
          .post('/api/sql/preview')
          .send({ sql: 'NOT SQL', policies: [] });
        expect(res.statusCode).toBe(400);
      });

      it('should return 400 when SQL is missing', async () => {
        const res = await request(app)
          .post('/api/sql/preview')
          .send({ policies: [] });
        expect(res.statusCode).toBe(400);
      });
    });
  });

  describe('SQL Execute API', () => {
    describe('POST /api/sql/execute', () => {
      it('should return 401 without authentication', async () => {
        const res = await request(app)
          .post('/api/sql/execute')
          .send({ sql: 'SELECT 1' });
        expect(res.statusCode).toBe(401);
      });
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });
  });
});
