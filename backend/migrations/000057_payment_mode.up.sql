-- Mode pembayaran eksplisit: 'partial' (DP sebagian), 'none' (tanpa DP,
-- bayar di tempat), 'full' (bayar lunas di awal). Sebelumnya mode ini hanya
-- tersirat dari dp_enabled + dp_percentage.

-- Setting default per tenant.
ALTER TABLE tenant_deposit_settings
	ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'partial';

UPDATE tenant_deposit_settings
SET payment_mode = CASE
	WHEN dp_enabled = false THEN 'none'
	WHEN dp_percentage >= 100 THEN 'full'
	ELSE 'partial'
END;

-- Override per resource.
ALTER TABLE tenant_resource_deposit_overrides
	ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'partial';

UPDATE tenant_resource_deposit_overrides
SET payment_mode = CASE
	WHEN dp_enabled = false THEN 'none'
	WHEN dp_percentage >= 100 THEN 'full'
	ELSE 'partial'
END;

-- Mode yang dipakai saat booking dibuat, disimpan agar UI & lifecycle
-- bisa membedakan tanpa menebak dari nominal.
ALTER TABLE bookings
	ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'partial';

UPDATE bookings
SET payment_mode = CASE
	WHEN deposit_amount <= 0 THEN 'none'
	WHEN deposit_amount >= grand_total THEN 'full'
	ELSE 'partial'
END;
