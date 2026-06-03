CREATE TABLE IF NOT EXISTS fnb_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id UUID NULL REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id UUID NULL REFERENCES customers(id) ON DELETE SET NULL,
    order_number VARCHAR(40) NOT NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'standalone',
    status VARCHAR(24) NOT NULL DEFAULT 'completed',
    payment_status VARCHAR(24) NOT NULL DEFAULT 'settled',
    payment_method VARCHAR(32) NOT NULL DEFAULT 'cash',
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fnb_orders_source_check CHECK (source IN ('standalone', 'booking')),
    CONSTRAINT fnb_orders_status_check CHECK (status IN ('draft', 'completed', 'cancelled')),
    CONSTRAINT fnb_orders_payment_status_check CHECK (payment_status IN ('unpaid', 'settled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_fnb_orders_order_number
    ON fnb_orders (tenant_id, order_number);

CREATE INDEX IF NOT EXISTS idx_fnb_orders_tenant_created
    ON fnb_orders (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fnb_orders_booking
    ON fnb_orders (booking_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fnb_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fnb_order_id UUID NOT NULL REFERENCES fnb_orders(id) ON DELETE CASCADE,
    fnb_item_id UUID NULL REFERENCES fnb_items(id) ON DELETE SET NULL,
    booking_order_item_id UUID NULL REFERENCES order_items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fnb_order_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT fnb_order_items_unit_price_check CHECK (unit_price >= 0),
    CONSTRAINT fnb_order_items_subtotal_check CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_fnb_order_items_order
    ON fnb_order_items (fnb_order_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_fnb_order_items_item
    ON fnb_order_items (fnb_item_id, created_at DESC);
