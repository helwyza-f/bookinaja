ALTER TABLE bookings DROP COLUMN IF EXISTS payment_mode;
ALTER TABLE tenant_resource_deposit_overrides DROP COLUMN IF EXISTS payment_mode;
ALTER TABLE tenant_deposit_settings DROP COLUMN IF EXISTS payment_mode;
