ALTER TABLE customers
  DROP COLUMN IF EXISTS phone_verified_at,
  DROP COLUMN IF EXISTS account_status;
