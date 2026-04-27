-- =============================================================================
-- MIGRATION: 000005_subscription_trial_and_customer_broadcast.up.sql
-- DESCRIPTION: Free trial defaults + customer broadcast support
-- =============================================================================

ALTER TABLE tenants
    ALTER COLUMN subscription_status SET DEFAULT 'trial';

COMMENT ON COLUMN tenants.subscription_status IS 'trial, active, inactive, suspended';

