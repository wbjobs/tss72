# 多租户数据库行级安全策略中间件

为多租户 SaaS 应用提供数据库行级安全策略（Row-Level Security）的配置和管理中间件。

## 核心功能

租户管理员可以通过 API 定义"哪些角色能看到哪些表中的哪些行"。例如："销售角色只能看到状态为'进行中'的订单"。服务在 SQL 执行时自动拼接行级安全条件。

## 项目结构

```
src/
├── app.js                    # Express 应用主入口
├── server.js                 # HTTP 服务器启动
├── database/
│   ├── db.js                 # PostgreSQL 连接池
│   ├── schema.sql            # 数据库 Schema 定义
│   └── migrate.js            # 迁移脚本
├── middleware/
│   └── auth.js               # 认证中间件（Header-based）
├── models/
│   ├── tenant.model.js       # 租户模型
│   ├── role.model.js         # 角色模型
│   ├── user.model.js         # 用户模型
│   └── rlsPolicy.model.js    # 行级安全策略模型
├── routes/
│   ├── tenants.routes.js     # 租户管理 API
│   ├── roles.routes.js       # 角色管理 API
│   ├── users.routes.js       # 用户管理 API
│   ├── rlsPolicies.routes.js # 策略管理 API
│   └── sql.routes.js         # SQL 预览/执行 API
├── security/
│   ├── conditionBuilder.js   # 策略条件构建器
│   ├── sqlRewriter.js        # SQL 解析与重写核心
│   └── secureQuery.js        # 安全查询执行器
└── services/
    ├── tenant.service.js
    ├── role.service.js
    ├── user.service.js
    └── rlsPolicy.service.js
tests/
├── unit/
│   ├── conditionBuilder.test.js  # 条件构建器测试
│   ├── sqlRewriter.test.js       # SQL 重写器测试（35 个用例）
│   └── rlsPolicy.service.test.js # 策略服务测试
└── integration/
    └── api.test.js               # API 集成测试
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 配置 PostgreSQL 连接信息。

### 3. 初始化数据库

```bash
npm run migrate
```

### 4. 启动服务

```bash
npm start
# 或开发模式
npm run dev
```

### 5. 运行测试

```bash
npm test
```

## API 文档

### 租户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tenants` | 获取所有租户 |
| POST | `/api/tenants` | 创建租户 |
| GET | `/api/tenants/:id` | 获取租户详情 |
| PUT | `/api/tenants/:id` | 更新租户 |
| DELETE | `/api/tenants/:id` | 删除租户 |

### 角色管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tenants/:tenantId/roles` | 获取租户下所有角色 |
| POST | `/api/tenants/:tenantId/roles` | 创建角色 |
| GET | `/api/tenants/:tenantId/roles/:id` | 获取角色详情 |
| PUT | `/api/tenants/:tenantId/roles/:id` | 更新角色 |
| DELETE | `/api/tenants/:tenantId/roles/:id` | 删除角色 |

### 用户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tenants/:tenantId/users` | 获取租户下所有用户 |
| POST | `/api/tenants/:tenantId/users` | 创建用户 |
| GET | `/api/tenants/:tenantId/users/:id` | 获取用户详情 |
| PUT | `/api/tenants/:tenantId/users/:id` | 更新用户 |
| DELETE | `/api/tenants/:tenantId/users/:id` | 删除用户 |
| POST | `/api/tenants/:tenantId/users/:id/roles/:roleId` | 为用户分配角色 |
| DELETE | `/api/tenants/:tenantId/users/:id/roles/:roleId` | 移除用户角色 |
| GET | `/api/tenants/:tenantId/users/:id/roles` | 获取用户角色列表 |

### 策略管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/policies` | 获取所有策略（支持过滤） |
| GET | `/api/tenants/:tenantId/policies` | 获取租户下策略 |
| POST | `/api/tenants/:tenantId/policies` | 创建策略 |
| GET | `/api/tenants/:tenantId/policies/:id` | 获取策略详情 |
| PUT | `/api/tenants/:tenantId/policies/:id` | 更新策略 |
| PATCH | `/api/tenants/:tenantId/policies/:id/enable` | 启用策略 |
| PATCH | `/api/tenants/:tenantId/policies/:id/disable` | 禁用策略 |
| DELETE | `/api/tenants/:tenantId/policies/:id` | 删除策略 |

### SQL 预览与执行

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/sql/preview` | 预览策略如何改写 SQL |
| POST | `/api/sql/execute` | 执行带策略的 SQL（需认证） |

## 策略定义

### 基于列条件

```json
{
  "tenant_id": "uuid",
  "role_id": "uuid",
  "table_name": "orders",
  "column_name": "status",
  "condition_operator": "IN",
  "condition_value": ["in_progress", "pending"],
  "description": "销售角色只能看到进行中和待处理的订单"
}
```

### 基于自定义条件

```json
{
  "tenant_id": "uuid",
  "role_id": "uuid",
  "table_name": "orders",
  "custom_condition": "created_by = current_setting('app.current_user_id')::uuid",
  "description": "只能看到自己创建的订单"
}
```

### 支持的操作符

`IN`, `NOT IN`, `=`, `!=`, `>`, `<`, `>=`, `<=`, `LIKE`, `IS NULL`, `IS NOT NULL`, `BETWEEN`

## SQL 预览接口

无需认证即可预览策略对 SQL 的改写效果：

```bash
curl -X POST http://localhost:3000/api/sql/preview \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM orders",
    "policies": [{
      "table_name": "orders",
      "column_name": "status",
      "condition_operator": "=",
      "condition_value": "in_progress"
    }]
  }'
```

## 认证方式

通过 HTTP Header 传递用户身份：

- `X-User-Id`: 用户 UUID
- `X-Tenant-Id`: 租户 UUID（可选）
- `X-Bypass-Rls`: 设置为 `true` 可绕过策略检查

## 技术栈

- **运行时**: Node.js
- **框架**: Express.js
- **数据库**: PostgreSQL
- **SQL 解析**: node-sql-parser
- **验证**: Joi
- **测试**: Jest + Supertest