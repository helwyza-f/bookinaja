ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS deposit_override_active BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deposit_override_reason TEXT,
    ADD COLUMN IF NOT EXISTS deposit_override_by TEXT,
    ADD COLUMN IF NOT EXISTS deposit_override_at TIMESTAMPTZ;
