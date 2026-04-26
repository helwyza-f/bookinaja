-- =============================================================================
-- MIGRATION: 000008_platform_customers.down.sql
-- DESCRIPTION: Best-effort rollback for platform customer refactor
-- =============================================================================

DROP INDEX IF EXISTS idx_customers_email;
DROP INDEX IF EXISTS idx_customers_spent;
DROP INDEX IF EXISTS idx_customers_phone;

ALTER TABLE customers
	DROP COLUMN IF EXISTS password,
	DROP COLUMN IF EXISTS email;

ALTER TABLE customers
	ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE customers
	ADD CONSTRAINT customers_tenant_id_phone_key UNIQUE (tenant_id, phone);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_spent ON customers(tenant_id, total_spent DESC);
