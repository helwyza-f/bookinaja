-- Kebijakan pembatalan per tenant.
-- refund_mode: 'forfeit' (DP hangus) | 'full' (DP dikembalikan penuh).
-- allowed_statuses: daftar status yang boleh dibatalkan (comma-separated).
CREATE TABLE IF NOT EXISTS tenant_cancellation_settings (
    tenant_id               UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    customer_cancel_enabled BOOLEAN NOT NULL DEFAULT false,
    cutoff_hours            INTEGER NOT NULL DEFAULT 0,
    refund_mode             TEXT    NOT NULL DEFAULT 'forfeit',
    require_reason          BOOLEAN NOT NULL DEFAULT false,
    allowed_statuses        TEXT    NOT NULL DEFAULT 'pending,confirmed',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
