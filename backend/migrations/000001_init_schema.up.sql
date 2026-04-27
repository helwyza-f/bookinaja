-- =============================================================================
-- MIGRATION: 000001_init_schema.up.sql
-- DESCRIPTION: Full Initial Schema for Bookinaja SaaS (Branding & Copy Ready)
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TENANTS (Central Business Data & Branding)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    business_category VARCHAR(50) NOT NULL,
    business_type VARCHAR(50),
    
    -- Branding & Copywriting (Sesuai Visual Screenshot)
    slogan TEXT DEFAULT '',           -- Teks kecil pendukung
    tagline TEXT DEFAULT '',          -- Judul besar Hero Section
    about_us TEXT DEFAULT '',         -- Deskripsi bisnis / Copy
    features TEXT[] DEFAULT '{}',     -- Array keunggulan (RTX 4090, 1Gbps, dll)
    
    -- Visual Config
    primary_color VARCHAR(10) DEFAULT '#3b82f6',
    logo_url TEXT DEFAULT '',
    banner_url TEXT DEFAULT '',
    gallery TEXT[] DEFAULT '{}',
    
    -- Contact & Socials
    address TEXT DEFAULT '',
    whatsapp_number VARCHAR(20) DEFAULT '',
    instagram_url TEXT DEFAULT '',
    tiktok_url TEXT DEFAULT '',
    map_iframe_url TEXT DEFAULT '',
    
    -- SEO Metadata
    meta_title VARCHAR(255) DEFAULT '',
    meta_description TEXT DEFAULT '',
    
    -- Operational & Metadata
    open_time TEXT DEFAULT '09:00',
    close_time TEXT DEFAULT '22:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- 3. USERS (Admin/Owners)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'owner', -- owner, staff
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CUSTOMERS (CRM & Loyalty System)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    tier VARCHAR(20) DEFAULT 'REGULAR', -- REGULAR, GOLD, VIP
    total_visits INTEGER DEFAULT 0,
    total_spent BIGINT DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE,
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, phone)
);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_tenant_spent ON customers(tenant_id, total_spent DESC);

-- 5. RESOURCES (Units: PC, Console, Table, Room)
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    description TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    gallery TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'available', -- available, maintenance, booked, deleted
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. RESOURCE ITEMS (Pricing & Packages)
CREATE TABLE resource_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price BIGINT NOT NULL DEFAULT 0, 
    price_unit VARCHAR(20) DEFAULT 'hour', 
    unit_duration INTEGER DEFAULT 60, -- in minutes
    item_type VARCHAR(20) NOT NULL, -- main_option, add_on
    is_default BOOLEAN DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- 7. BOOKINGS (Main Transactions)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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

-- 8. BOOKING OPTIONS (Selected Rates during Booking)
CREATE TABLE booking_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    resource_item_id UUID REFERENCES resource_items(id),
    quantity INTEGER NOT NULL DEFAULT 1, 
    price_at_booking BIGINT NOT NULL 
);
CREATE INDEX idx_booking_options_booking_id ON booking_options(booking_id);

-- 9. FNB ITEMS (Canteen/Bar Menu)
CREATE TABLE fnb_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    price BIGINT NOT NULL DEFAULT 0,
    category VARCHAR(100),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. ORDER ITEMS (Food Purchases linked to Booking/Billing)
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