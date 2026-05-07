ALTER TABLE tenant_promo_codes
ADD COLUMN IF NOT EXISTS discount_behavior VARCHAR(32) NOT NULL DEFAULT 'locked';

CREATE TABLE IF NOT EXISTS tenant_deposit_settings (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    dp_enabled BOOLEAN NOT NULL DEFAULT true,
    dp_percentage DOUBLE PRECISION NOT NULL DEFAULT 40,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_resource_deposit_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    override_dp BOOLEAN NOT NULL DEFAULT false,
    dp_enabled BOOLEAN NOT NULL DEFAULT true,
    dp_percentage DOUBLE PRECISION NOT NULL DEFAULT 40,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, resource_id)
);

INSERT INTO tenant_deposit_settings (tenant_id, dp_enabled, dp_percentage, created_at, updated_at)
SELECT id, true, 40, NOW(), NOW()
FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;
