-- 多租户行级安全策略中间件 - 数据库Schema

-- 1. 租户表
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

-- 2. 角色表
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);

-- 3. 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, username)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- 4. 用户-角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- 5. 行级安全策略表
CREATE TABLE IF NOT EXISTS rls_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    table_name VARCHAR(255) NOT NULL,
    column_name VARCHAR(255),
    condition_operator VARCHAR(20) NOT NULL DEFAULT 'IN',
    condition_value JSONB,
    custom_condition TEXT,
    is_enabled BOOLEAN DEFAULT true,
    priority INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rls_policies_tenant_id ON rls_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rls_policies_role_id ON rls_policies(role_id);
CREATE INDEX IF NOT EXISTS idx_rls_policies_table_name ON rls_policies(table_name);

-- 插入示例数据
INSERT INTO tenants (name, description) VALUES
    ('tenant_a', '示例租户A')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (tenant_id, name, description) 
SELECT t.id, 'sales', '销售角色' FROM tenants t WHERE t.name = 'tenant_a'
ON CONFLICT DO NOTHING;

INSERT INTO roles (tenant_id, name, description) 
SELECT t.id, 'admin', '管理员角色' FROM tenants t WHERE t.name = 'tenant_a'
ON CONFLICT DO NOTHING;

INSERT INTO users (tenant_id, username, email) 
SELECT t.id, 'user1', 'user1@example.com' FROM tenants t WHERE t.name = 'tenant_a'
ON CONFLICT DO NOTHING;
