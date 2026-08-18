-- Kembalikan ke satu baris per tenant. Best-effort: sisakan baris aktif saja
-- agar constraint unik (tenant_id) bisa dipasang lagi.
DELETE FROM tenant_payment_gateways t
USING tenant_payment_gateways a
WHERE t.tenant_id = a.tenant_id
  AND a.is_active = true
  AND t.id <> a.id;

ALTER TABLE tenant_payment_gateways
	DROP CONSTRAINT IF EXISTS tenant_payment_gateways_tenant_provider_key;

ALTER TABLE tenant_payment_gateways
	ADD CONSTRAINT tenant_payment_gateways_tenant_id_key UNIQUE (tenant_id);

ALTER TABLE tenant_payment_gateways
	DROP COLUMN IF EXISTS is_active;
