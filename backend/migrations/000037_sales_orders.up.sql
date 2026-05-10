CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE RESTRICT,
    order_number VARCHAR(40) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'open',
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    balance_due NUMERIC(14,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(24) NOT NULL DEFAULT 'unpaid',
    payment_method VARCHAR(32) NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT sales_orders_status_check CHECK (status IN ('open', 'pending_payment', 'paid', 'completed', 'cancelled')),
    CONSTRAINT sales_orders_payment_status_check CHECK (payment_status IN ('unpaid', 'pending', 'partial_paid', 'settled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_sales_orders_order_number
    ON sales_orders (tenant_id, order_number);

CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant_status
    ON sales_orders (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_orders_resource
    ON sales_orders (resource_id);

CREATE INDEX IF NOT EXISTS idx_sales_orders_customer
    ON sales_orders (customer_id);

CREATE TABLE IF NOT EXISTS sales_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    resource_item_id UUID REFERENCES resource_items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(32) NOT NULL DEFAULT 'direct_sale',
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT sales_order_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT sales_order_items_unit_price_check CHECK (unit_price >= 0),
    CONSTRAINT sales_order_items_subtotal_check CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sales_order_items_order
    ON sales_order_items (sales_order_id, created_at ASC);
