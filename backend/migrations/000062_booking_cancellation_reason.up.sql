-- Alasan & pelaku pembatalan booking (untuk audit + tampilan detail).
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
