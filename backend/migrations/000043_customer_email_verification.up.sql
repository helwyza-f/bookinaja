ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

UPDATE customers
SET email_verified_at = COALESCE(email_verified_at, updated_at, created_at)
WHERE google_subject IS NOT NULL
  AND BTRIM(google_subject) <> ''
  AND COALESCE(NULLIF(BTRIM(email), ''), '') <> ''
  AND email_verified_at IS NULL;
