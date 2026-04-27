-- =============================================================================
-- MIGRATION: 000005_subscription_trial_and_customer_broadcast.down.sql
-- DESCRIPTION: Revert free trial defaults
-- =============================================================================

ALTER TABLE tenants
    ALTER COLUMN subscription_status SET DEFAULT 'inactive';

