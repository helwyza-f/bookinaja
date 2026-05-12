-- =============================================================================
-- MIGRATION: 000042_platform_email_logs.down.sql
-- DESCRIPTION: Rollback platform email audit trail
-- =============================================================================

DROP TABLE IF EXISTS platform_email_logs;
