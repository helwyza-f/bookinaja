-- BYO gateway multi-provider: simpan konfigurasi Midtrans DAN Xendit
-- berdampingan (satu baris per provider), dengan satu provider aktif per tenant.
-- Endpoint lama tetap beroperasi pada baris is_active=true (kompatibel web).

ALTER TABLE tenant_payment_gateways
	ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Longgarkan keunikan dari (tenant_id) menjadi (tenant_id, provider).
ALTER TABLE tenant_payment_gateways
	DROP CONSTRAINT IF EXISTS tenant_payment_gateways_tenant_id_key;

ALTER TABLE tenant_payment_gateways
	ADD CONSTRAINT tenant_payment_gateways_tenant_provider_key
	UNIQUE (tenant_id, provider);

-- Pastikan tiap tenant punya tepat satu baris aktif (data lama = 1 baris → aktif).
UPDATE tenant_payment_gateways SET is_active = true;
