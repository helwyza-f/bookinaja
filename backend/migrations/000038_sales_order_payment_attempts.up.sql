CREATE TABLE IF NOT EXISTS sales_order_payment_attempts (
    id UUID PRIMARY KEY,
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NULL REFERENCES customers(id) ON DELETE SET NULL,
    method_code VARCHAR(64) NOT NULL,
    method_label VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'manual',
    verification_type VARCHAR(32) NOT NULL DEFAULT 'manual',
    payment_scope VARCHAR(32) NOT NULL DEFAULT 'settlement',
    amount BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    reference_code VARCHAR(64) NOT NULL DEFAULT '',
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

CREATE INDEX IF NOT EXISTS idx_sales_order_payment_attempts_order_created
    ON sales_order_payment_attempts(sales_order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_order_payment_attempts_tenant_status
    ON sales_order_payment_attempts(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_order_payment_attempts_gateway_order
    ON sales_order_payment_attempts(gateway_order_id);
