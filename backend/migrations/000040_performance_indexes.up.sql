-- =============================================================================
-- MIGRATION: 000040_performance_indexes.up.sql
-- DESCRIPTION: Targeted indexes for tenant lookup, booking hot paths, resource catalogs,
--              and payment attempt webhook lookups
-- =============================================================================

-- Tenant resolution and referral lookup often normalize text in WHERE clauses.
CREATE INDEX IF NOT EXISTS idx_tenants_slug_normalized
    ON tenants (LOWER(TRIM(slug)));

CREATE INDEX IF NOT EXISTS idx_tenants_referral_code_normalized
    ON tenants (LOWER(TRIM(referral_code)))
    WHERE referral_code IS NOT NULL AND referral_code <> '';

-- Resource catalog and admin list paths are heavily tenant-scoped and ordered by recency.
CREATE INDEX IF NOT EXISTS idx_resources_tenant_status_created
    ON resources (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resource_items_resource_type_default_price
    ON resource_items (resource_id, item_type, is_default DESC, price ASC);

-- Booking overlap checks, scheduler scans, and tenant booking lists are core hot paths.
CREATE INDEX IF NOT EXISTS idx_bookings_resource_active_window
    ON bookings (resource_id, start_time, end_time)
    WHERE status NOT IN ('cancelled', 'rejected');

CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status_start
    ON bookings (tenant_id, status, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_status_end_start
    ON bookings (status, end_time DESC, start_time ASC);

-- Customer pages frequently sort by recency inside a tenant.
CREATE INDEX IF NOT EXISTS idx_customers_tenant_updated_created
    ON customers (tenant_id, updated_at DESC, created_at DESC);

-- Webhook/payment paths fetch latest attempt by gateway order id.
CREATE INDEX IF NOT EXISTS idx_booking_payment_attempts_gateway_order_created
    ON booking_payment_attempts (gateway_order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_order_payment_attempts_gateway_order_created
    ON sales_order_payment_attempts (gateway_order_id, created_at DESC);
