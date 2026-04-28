-- =============================================================================
-- MIGRATION: 000015_referral_withdrawals.up.sql
-- DESCRIPTION: Referral payout requests for tenant and platform admin review
-- =============================================================================

CREATE TABLE IF NOT EXISTS referral_withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, paid
    requested_by_user_id UUID NULL,
    reviewed_by_user_id UUID NULL,
    reviewed_at TIMESTAMPTZ NULL,
    paid_at TIMESTAMPTZ NULL,
    note TEXT DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_withdrawal_requests_status ON referral_withdrawal_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_withdrawal_requests_tenant ON referral_withdrawal_requests(tenant_id, created_at DESC);
