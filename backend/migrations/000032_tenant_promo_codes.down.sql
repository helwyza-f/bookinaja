ALTER TABLE bookings
  DROP COLUMN IF EXISTS promo_snapshot,
  DROP COLUMN IF EXISTS discount_amount,
  DROP COLUMN IF EXISTS original_grand_total,
  DROP COLUMN IF EXISTS promo_code,
  DROP COLUMN IF EXISTS promo_id;

DROP TABLE IF EXISTS tenant_promo_redemptions;
DROP TABLE IF EXISTS tenant_promo_resources;
DROP TABLE IF EXISTS tenant_promo_codes;
