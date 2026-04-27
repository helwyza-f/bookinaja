-- =============================================================================
-- MIGRATION: 000003_booking_payment_schema.up.sql
-- DESCRIPTION: Booking payment state, deposit, and settlement fields
-- =============================================================================

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS grand_total BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deposit_amount BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS paid_amount BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS balance_due BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(32) NOT NULL DEFAULT 'unpaid',
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(32) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS reminder_20m_sent_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reminder_5m_sent_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS session_activated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
