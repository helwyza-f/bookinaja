-- =============================================================================
-- MIGRATION: 000006_tenant_audit_and_staff.up.sql
-- DESCRIPTION: Audit trail + staff management support
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_tenant_created
    ON tenant_audit_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_actor
    ON tenant_audit_logs(actor_user_id, created_at DESC);

