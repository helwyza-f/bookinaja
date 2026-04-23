-- =============================================================================
-- MIGRATION: 000006_tenant_audit_and_staff.down.sql
-- DESCRIPTION: Rollback audit trail + staff management support
-- =============================================================================

DROP TABLE IF EXISTS tenant_audit_logs;

