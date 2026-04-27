-- =============================================================================
-- MIGRATION: 000004_tenant_ledger_and_midtrans_logs.down.sql
-- DESCRIPTION: Rollback tenant ledger and Midtrans audit trail
-- =============================================================================

DROP TABLE IF EXISTS midtrans_notification_logs;
DROP TABLE IF EXISTS tenant_ledger_entries;

