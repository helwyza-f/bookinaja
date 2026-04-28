-- =============================================================================
-- MIGRATION: 000014_referral_program.up.sql
-- DESCRIPTION: Tenant referral program + one-time reward ledger
-- =============================================================================

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS referral_code TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS referred_by_tenant_id UUID NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'tenants'
          AND constraint_type = 'foreign key'
          AND constraint_name = 'fk_tenants_referred_by_tenant'
    ) THEN
        ALTER TABLE tenants
            ADD CONSTRAINT fk_tenants_referred_by_tenant
            FOREIGN KEY (referred_by_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_referral_code ON tenants(referral_code) WHERE referral_code <> '';
CREATE INDEX IF NOT EXISTS idx_tenants_referred_by_tenant_id ON tenants(referred_by_tenant_id);

CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    referred_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_order_id TEXT NOT NULL,
    reward_amount BIGINT NOT NULL DEFAULT 100000,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, available, withdrawn, cancelled
    available_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (referred_tenant_id),
    UNIQUE (source_order_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred ON referral_rewards(referred_tenant_id);
