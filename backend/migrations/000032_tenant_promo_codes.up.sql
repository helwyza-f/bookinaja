CREATE TABLE IF NOT EXISTS tenant_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL,
  discount_value BIGINT NOT NULL,
  max_discount_amount BIGINT,
  min_booking_amount BIGINT,
  usage_limit_total INTEGER,
  usage_limit_per_customer INTEGER,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  valid_weekdays JSONB,
  time_start TIME,
  time_end TIME,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT tenant_promo_codes_discount_type_check CHECK (discount_type IN ('percentage', 'fixed')),
  CONSTRAINT tenant_promo_codes_discount_value_check CHECK (discount_value > 0),
  CONSTRAINT tenant_promo_codes_max_discount_amount_check CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
  CONSTRAINT tenant_promo_codes_min_booking_amount_check CHECK (min_booking_amount IS NULL OR min_booking_amount >= 0),
  CONSTRAINT tenant_promo_codes_usage_limit_total_check CHECK (usage_limit_total IS NULL OR usage_limit_total > 0),
  CONSTRAINT tenant_promo_codes_usage_limit_per_customer_check CHECK (usage_limit_per_customer IS NULL OR usage_limit_per_customer > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_promo_codes_tenant_code_unique
  ON tenant_promo_codes (tenant_id, LOWER(code))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS tenant_promo_codes_tenant_idx
  ON tenant_promo_codes (tenant_id, is_active, deleted_at);

CREATE TABLE IF NOT EXISTS tenant_promo_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL REFERENCES tenant_promo_codes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_promo_resources_unique
  ON tenant_promo_resources (promo_id, resource_id);

CREATE INDEX IF NOT EXISTS tenant_promo_resources_tenant_idx
  ON tenant_promo_resources (tenant_id, resource_id);

CREATE TABLE IF NOT EXISTS tenant_promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL REFERENCES tenant_promo_codes(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  promo_code VARCHAR(64) NOT NULL,
  discount_amount BIGINT NOT NULL,
  original_amount BIGINT NOT NULL,
  final_amount BIGINT NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'redeemed',
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_promo_redemptions_booking_unique
  ON tenant_promo_redemptions (booking_id);

CREATE INDEX IF NOT EXISTS tenant_promo_redemptions_promo_idx
  ON tenant_promo_redemptions (promo_id, status);

CREATE INDEX IF NOT EXISTS tenant_promo_redemptions_customer_idx
  ON tenant_promo_redemptions (tenant_id, customer_id, promo_id, status);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS promo_id UUID REFERENCES tenant_promo_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promo_code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS original_grand_total DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_snapshot JSONB;
