ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS registration_source VARCHAR(32),
    ADD COLUMN IF NOT EXISTS account_stage VARCHAR(24),
    ADD COLUMN IF NOT EXISTS google_subject VARCHAR(191),
    ADD COLUMN IF NOT EXISTS last_login_method VARCHAR(24),
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS silent_registered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS gender VARCHAR(16),
    ADD COLUMN IF NOT EXISTS city VARCHAR(80),
    ADD COLUMN IF NOT EXISTS province VARCHAR(80),
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(8) NOT NULL DEFAULT 'ID';

UPDATE customers
SET registration_source = CASE
        WHEN COALESCE(NULLIF(BTRIM(registration_source), ''), '') <> '' THEN registration_source
        WHEN password IS NOT NULL OR COALESCE(NULLIF(BTRIM(email), ''), '') <> '' THEN 'manual'
        ELSE 'booking'
    END
WHERE registration_source IS NULL OR BTRIM(registration_source) = '';

UPDATE customers
SET account_stage = CASE
        WHEN COALESCE(NULLIF(BTRIM(account_stage), ''), '') <> '' THEN account_stage
        WHEN COALESCE(account_status, 'verified') = 'suspended' THEN 'suspended'
        WHEN password IS NOT NULL OR COALESCE(NULLIF(BTRIM(email), ''), '') <> '' THEN 'active'
        ELSE 'provisioned'
    END
WHERE account_stage IS NULL OR BTRIM(account_stage) = '';

UPDATE customers
SET silent_registered_at = created_at
WHERE silent_registered_at IS NULL
  AND registration_source = 'booking'
  AND account_stage = 'provisioned';

UPDATE customers
SET profile_completed_at = COALESCE(phone_verified_at, updated_at, created_at)
WHERE profile_completed_at IS NULL
  AND account_stage = 'active';

CREATE INDEX IF NOT EXISTS idx_customers_account_stage ON customers (account_stage);
CREATE INDEX IF NOT EXISTS idx_customers_registration_source ON customers (registration_source);
CREATE INDEX IF NOT EXISTS idx_customers_email_lower ON customers (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS uniq_customers_google_subject
    ON customers (google_subject)
    WHERE google_subject IS NOT NULL AND BTRIM(google_subject) <> '';
