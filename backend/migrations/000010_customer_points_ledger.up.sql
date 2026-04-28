-- =============================================================================
-- MIGRATION: 000010_customer_points_ledger.up.sql
-- DESCRIPTION: Platform-level Bookinaja Points ledger for global customers
-- =============================================================================

CREATE TABLE IF NOT EXISTS customer_point_ledger (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
	tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
	booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
	event_type VARCHAR(24) NOT NULL,
	points INTEGER NOT NULL,
	description TEXT,
	metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_point_ledger_customer_created
	ON customer_point_ledger(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_point_ledger_tenant_created
	ON customer_point_ledger(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_point_ledger_booking
	ON customer_point_ledger(booking_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_point_ledger_booking_earn_once
	ON customer_point_ledger(booking_id, event_type)
	WHERE booking_id IS NOT NULL AND event_type = 'earn';
