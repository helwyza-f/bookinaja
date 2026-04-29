CREATE TABLE IF NOT EXISTS legacy_customer_contacts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    source TEXT DEFAULT 'manual',
    last_blast_at TIMESTAMP WITH TIME ZONE,
    blast_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_legacy_customer_contacts_tenant ON legacy_customer_contacts(tenant_id, updated_at DESC);
