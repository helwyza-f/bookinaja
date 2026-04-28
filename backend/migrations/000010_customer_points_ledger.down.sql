-- =============================================================================
-- MIGRATION: 000010_customer_points_ledger.down.sql
-- DESCRIPTION: Drop platform-level Bookinaja Points ledger
-- =============================================================================

DROP INDEX IF EXISTS idx_customer_point_ledger_booking_earn_once;
DROP INDEX IF EXISTS idx_customer_point_ledger_booking;
DROP INDEX IF EXISTS idx_customer_point_ledger_tenant_created;
DROP INDEX IF EXISTS idx_customer_point_ledger_customer_created;
DROP TABLE IF EXISTS customer_point_ledger;
