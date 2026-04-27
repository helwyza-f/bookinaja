-- =============================================================================
-- MIGRATION: 000008_platform_customers.up.sql
-- DESCRIPTION: Customer becomes a platform-level entity, no longer tenant-bound
-- =============================================================================

ALTER TABLE customers
	ADD COLUMN IF NOT EXISTS email VARCHAR(255),
	ADD COLUMN IF NOT EXISTS password TEXT;

ALTER TABLE customers
	ALTER COLUMN tenant_id DROP NOT NULL;

WITH ranked AS (
	SELECT
		id,
		phone,
		FIRST_VALUE(id) OVER (
			PARTITION BY phone
			ORDER BY updated_at DESC, created_at DESC, id DESC
		) AS keep_id,
		ROW_NUMBER() OVER (
			PARTITION BY phone
			ORDER BY updated_at DESC, created_at DESC, id DESC
		) AS rn
	FROM customers
	WHERE phone IS NOT NULL AND TRIM(phone) <> ''
),
dupes AS (
	SELECT id AS duplicate_id, keep_id
	FROM ranked
	WHERE rn > 1
)
UPDATE bookings b
SET customer_id = d.keep_id
FROM dupes d
WHERE b.customer_id = d.duplicate_id;

WITH ranked AS (
	SELECT
		id,
		phone,
		FIRST_VALUE(id) OVER (
			PARTITION BY phone
			ORDER BY updated_at DESC, created_at DESC, id DESC
		) AS keep_id,
		ROW_NUMBER() OVER (
			PARTITION BY phone
			ORDER BY updated_at DESC, created_at DESC, id DESC
		) AS rn
	FROM customers
	WHERE phone IS NOT NULL AND TRIM(phone) <> ''
),
dupes AS (
	SELECT id AS duplicate_id, keep_id
	FROM ranked
	WHERE rn > 1
)
DELETE FROM customers c
USING dupes d
WHERE c.id = d.duplicate_id;

UPDATE customers
SET tenant_id = NULL;

ALTER TABLE customers
	DROP CONSTRAINT IF EXISTS customers_tenant_id_phone_key;

DROP INDEX IF EXISTS idx_customers_phone;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

DROP INDEX IF EXISTS idx_customers_tenant_spent;
CREATE INDEX IF NOT EXISTS idx_customers_spent ON customers(total_spent DESC);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
