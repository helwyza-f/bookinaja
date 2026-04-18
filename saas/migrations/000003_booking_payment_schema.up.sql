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
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(32) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
