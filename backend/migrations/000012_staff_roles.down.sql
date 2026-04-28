-- =============================================================================
-- MIGRATION: 000012_staff_roles.down.sql
-- DESCRIPTION: Rollback tenant-scoped staff roles
-- =============================================================================

ALTER TABLE users
    DROP COLUMN IF EXISTS role_id;

DROP TABLE IF EXISTS staff_roles;

