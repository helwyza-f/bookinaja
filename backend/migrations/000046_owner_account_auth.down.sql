DROP INDEX IF EXISTS idx_users_deleted_at;

ALTER TABLE users
    DROP COLUMN IF EXISTS deleted_at,
    DROP COLUMN IF EXISTS password_setup_required,
    DROP COLUMN IF EXISTS email_verified_at;
