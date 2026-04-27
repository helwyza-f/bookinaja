-- =============================================================================
-- MIGRATION: 000002_billing_schema.up.sql
-- DESCRIPTION: Subscription & Billing tables (Midtrans)
-- =============================================================================

-- Add subscription fields to tenants (selected via SELECT * across the codebase)
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS plan VARCHAR(32) NOT NULL DEFAULT 'starter',
    ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(32) NOT NULL DEFAULT 'inactive',
    ADD COLUMN IF NOT EXISTS subscription_current_period_start TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE;

-- Billing orders created during checkout (Midtrans Snap order_id)
CREATE TABLE IF NOT EXISTS billing_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id VARCHAR(128) NOT NULL UNIQUE,
    plan VARCHAR(32) NOT NULL,          -- starter, pro
    billing_interval VARCHAR(16) NOT NULL, -- monthly, annual
    amount BIGINT NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'IDR',
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, paid, expired, cancelled, denied, failed

    midtrans_transaction_id VARCHAR(128),
    midtrans_payment_type VARCHAR(64),
    midtrans_raw JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_orders_tenant_created ON billing_orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_orders_status ON billing_orders(status);

