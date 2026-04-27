ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

UPDATE customers
SET
  account_status = 'verified',
  phone_verified_at = COALESCE(phone_verified_at, updated_at, created_at)
WHERE COALESCE(account_status, '') = '' OR account_status = 'verified';
