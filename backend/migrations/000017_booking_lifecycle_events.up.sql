-- =============================================================================
-- MIGRATION: 000017_booking_lifecycle_events.up.sql
-- DESCRIPTION: Canonical booking lifecycle timestamps and event timeline
-- =============================================================================

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_status_changed_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS booking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NULL REFERENCES customers(id) ON DELETE SET NULL,
    actor_type VARCHAR(32) NOT NULL DEFAULT 'system', -- customer, admin, system, payment
    event_type VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_created ON booking_events(booking_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_booking_events_tenant_created ON booking_events(tenant_id, created_at DESC);
