-- =============================================================================
-- MIGRATION: 000004_tenant_ledger_and_midtrans_logs.up.sql
-- DESCRIPTION: Tenant balance ledger and Midtrans notification audit trail
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_type VARCHAR(32) NOT NULL, -- booking_payment, subscription, refund, payout, adjustment
    source_id UUID,
    source_ref VARCHAR(128) NOT NULL DEFAULT '',
    midtrans_order_id VARCHAR(128) NOT NULL DEFAULT '',
    midtrans_transaction_id VARCHAR(128) NOT NULL DEFAULT '',
    transaction_status VARCHAR(32) NOT NULL DEFAULT '',
    payment_type VARCHAR(64) NOT NULL DEFAULT '',
    direction VARCHAR(16) NOT NULL CHECK (direction IN ('credit', 'debit')),
    gross_amount BIGINT NOT NULL DEFAULT 0,
    platform_fee BIGINT NOT NULL DEFAULT 0,
    net_amount BIGINT NOT NULL DEFAULT 0,
    balance_after BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    dedupe_key VARCHAR(256) NOT NULL UNIQUE,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_ledger_entries_tenant_created
    ON tenant_ledger_entries(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_ledger_entries_source
    ON tenant_ledger_entries(source_type, source_ref);
CREATE INDEX IF NOT EXISTS idx_tenant_ledger_entries_status
    ON tenant_ledger_entries(status);

CREATE TABLE IF NOT EXISTS midtrans_notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    order_id VARCHAR(128) NOT NULL,
    transaction_id VARCHAR(128) NOT NULL DEFAULT '',
    transaction_status VARCHAR(32) NOT NULL DEFAULT '',
    fraud_status VARCHAR(32) NOT NULL DEFAULT '',
    payment_type VARCHAR(64) NOT NULL DEFAULT '',
    gross_amount BIGINT NOT NULL DEFAULT 0,
    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    processing_status VARCHAR(32) NOT NULL DEFAULT 'received', -- received, processed, ignored, failed
    error_message TEXT NOT NULL DEFAULT '',
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_midtrans_notification_logs_received_at
    ON midtrans_notification_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_midtrans_notification_logs_tenant_received
    ON midtrans_notification_logs(tenant_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_midtrans_notification_logs_order_id
    ON midtrans_notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_midtrans_notification_logs_status
    ON midtrans_notification_logs(processing_status);

