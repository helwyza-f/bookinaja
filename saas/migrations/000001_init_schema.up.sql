-- 000001_init_schema.up.sql

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TENANTS
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    business_category VARCHAR(50) NOT NULL,
    business_type VARCHAR(50),
    slogan TEXT DEFAULT '',
    address TEXT DEFAULT '',
    open_time TEXT DEFAULT '09:00',
    close_time TEXT DEFAULT '22:00',
    logo_url TEXT DEFAULT '',
    banner_url TEXT DEFAULT '',
    gallery TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- 3. USERS (ADMIN)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'owner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CUSTOMERS (REFACTORED FOR CRM)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    
    -- CRM Fields (Physical stats for high performance)
    tier VARCHAR(20) DEFAULT 'REGULAR', -- REGULAR, GOLD, VIP
    total_visits INTEGER DEFAULT 0,
    total_spent BIGINT DEFAULT 0,       -- BigInt lebih aman dan presisi untuk uang
    last_visit TIMESTAMP WITH TIME ZONE,
    
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, phone)
);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_tenant_spent ON customers(tenant_id, total_spent DESC);

-- 5. RESOURCES (Units like Studio A, Table 1, Room 101, etc)
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    description TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    gallery TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'available',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. RESOURCE ITEMS (Pricing options like Hourly, Member, etc)
CREATE TABLE resource_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price BIGINT NOT NULL DEFAULT 0, 
    price_unit VARCHAR(20) DEFAULT 'hour', 
    unit_duration INTEGER DEFAULT 60, 
    item_type VARCHAR(20) NOT NULL, -- main_option, add_on
    is_default BOOLEAN DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- 7. BOOKINGS
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    resource_id UUID REFERENCES resources(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    access_token UUID DEFAULT uuid_generate_v4(),
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_tenant_time ON bookings(tenant_id, start_time, end_time);
CREATE INDEX idx_bookings_access_token ON bookings(access_token);

-- 8. BOOKING OPTIONS (Selected Resource Items during booking)
CREATE TABLE booking_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    resource_item_id UUID REFERENCES resource_items(id),
    quantity INTEGER NOT NULL DEFAULT 1, 
    price_at_booking BIGINT NOT NULL -- Subtotal (Unit Price * Qty) saat transaksi
);
CREATE INDEX idx_booking_options_booking_id ON booking_options(booking_id);

-- 9. FNB ITEMS (Global catalog for canteen)
CREATE TABLE fnb_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    price BIGINT NOT NULL DEFAULT 0,
    category VARCHAR(100),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. ORDER ITEMS (Transactions for FnB that attach to Bookings)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    fnb_item_id UUID REFERENCES fnb_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_purchase BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'delivered', -- ordered, delivered, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_order_items_booking_id ON order_items(booking_id);