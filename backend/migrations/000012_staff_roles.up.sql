-- =============================================================================
-- MIGRATION: 000012_staff_roles.up.sql
-- DESCRIPTION: Tenant-scoped staff roles with permissions
-- =============================================================================

CREATE TABLE IF NOT EXISTS staff_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    permission_keys TEXT[] NOT NULL DEFAULT '{}',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES staff_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_staff_roles_tenant
    ON staff_roles(tenant_id);

