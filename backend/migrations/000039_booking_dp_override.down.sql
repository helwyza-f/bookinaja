ALTER TABLE bookings
    DROP COLUMN IF EXISTS deposit_override_at,
    DROP COLUMN IF EXISTS deposit_override_by,
    DROP COLUMN IF EXISTS deposit_override_reason,
    DROP COLUMN IF EXISTS deposit_override_active;
