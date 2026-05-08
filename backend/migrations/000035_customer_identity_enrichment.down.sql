DROP INDEX IF EXISTS uniq_customers_google_subject;
DROP INDEX IF EXISTS idx_customers_email_lower;
DROP INDEX IF EXISTS idx_customers_registration_source;
DROP INDEX IF EXISTS idx_customers_account_stage;

ALTER TABLE customers
    DROP COLUMN IF EXISTS country_code,
    DROP COLUMN IF EXISTS province,
    DROP COLUMN IF EXISTS city,
    DROP COLUMN IF EXISTS gender,
    DROP COLUMN IF EXISTS birth_date,
    DROP COLUMN IF EXISTS marketing_opt_in,
    DROP COLUMN IF EXISTS profile_completed_at,
    DROP COLUMN IF EXISTS silent_registered_at,
    DROP COLUMN IF EXISTS last_login_at,
    DROP COLUMN IF EXISTS last_login_method,
    DROP COLUMN IF EXISTS google_subject,
    DROP COLUMN IF EXISTS account_stage,
    DROP COLUMN IF EXISTS registration_source;
