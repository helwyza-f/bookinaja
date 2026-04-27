-- =============================================================================
-- MIGRATION: 000007_expenses.up.sql
-- DESCRIPTION: Tenant expense tracking for profit analysis
-- =============================================================================

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Operasional',
    amount BIGINT NOT NULL DEFAULT 0,
    expense_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
    vendor VARCHAR(255) DEFAULT '',
    notes TEXT DEFAULT '',
    receipt_url TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date
    ON expenses(tenant_id, expense_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_category
    ON expenses(tenant_id, category);

