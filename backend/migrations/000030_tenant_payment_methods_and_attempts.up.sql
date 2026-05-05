-- MIGRATION: 000030_tenant_payment_methods_and_attempts.up.sql
-- DESCRIPTION: Tenant payment method settings and booking payment attempts

CREATE TABLE IF NOT EXISTS tenant_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'manual',
    verification_type VARCHAR(32) NOT NULL DEFAULT 'manual',
    provider VARCHAR(64) NOT NULL DEFAULT '',
    instructions TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_tenant_payment_methods_tenant_active
    ON tenant_payment_methods(tenant_id, is_active, sort_order ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS booking_payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NULL REFERENCES customers(id) ON DELETE SET NULL,
    method_code VARCHAR(64) NOT NULL,
    method_label VARCHAR(128) NOT NULL DEFAULT '',
    category VARCHAR(32) NOT NULL DEFAULT 'manual',
    verification_type VARCHAR(32) NOT NULL DEFAULT 'manual',
    payment_scope VARCHAR(32) NOT NULL DEFAULT 'deposit',
    amount BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    reference_code VARCHAR(128) NOT NULL DEFAULT '',
    gateway_order_id VARCHAR(128) NOT NULL DEFAULT '',
    gateway_transaction_id VARCHAR(128) NOT NULL DEFAULT '',
    payer_note TEXT NOT NULL DEFAULT '',
    admin_note TEXT NOT NULL DEFAULT '',
    proof_url TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ NULL,
    verified_at TIMESTAMPTZ NULL,
    rejected_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_payment_attempts_booking_created
    ON booking_payment_attempts(booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_payment_attempts_tenant_status
    ON booking_payment_attempts(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_payment_attempts_gateway_order
    ON booking_payment_attempts(gateway_order_id);
