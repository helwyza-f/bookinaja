-- =============================================================================
-- MIGRATION: 000011_staff_permissions.down.sql
-- DESCRIPTION: Rollback permission matrix for tenant staff
-- =============================================================================

DROP TABLE IF EXISTS user_permissions;

