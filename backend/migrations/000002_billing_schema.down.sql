-- =============================================================================
-- MIGRATION: 000002_billing_schema.down.sql
-- DESCRIPTION: Rollback subscription & billing tables (Midtrans)
-- =============================================================================

DROP TABLE IF EXISTS billing_orders;

ALTER TABLE tenants
    DROP COLUMN IF EXISTS subscription_current_period_end,
    DROP COLUMN IF EXISTS subscription_current_period_start,
    DROP COLUMN IF EXISTS subscription_status,
    DROP COLUMN IF EXISTS plan;

