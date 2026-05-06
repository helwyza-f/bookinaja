DROP TABLE IF EXISTS tenant_resource_deposit_overrides;
DROP TABLE IF EXISTS tenant_deposit_settings;
ALTER TABLE tenant_promo_codes
DROP COLUMN IF EXISTS discount_behavior;
