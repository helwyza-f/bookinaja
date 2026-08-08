-- Kapan owner terakhir menunda ("nanti saja") nudge setup pembayaran online.
-- Dipakai agar modal pengingat di dashboard tidak muncul terus-menerus.
ALTER TABLE tenants
	ADD COLUMN IF NOT EXISTS payment_setup_snoozed_at TIMESTAMPTZ;
