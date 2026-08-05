UPDATE tenant_payment_methods
SET display_name = 'Midtrans / QRIS Gateway'
WHERE display_name = 'Pembayaran Online (QRIS, VA, E-wallet)';

UPDATE tenant_payment_methods
SET instructions = 'Pembayaran diverifikasi otomatis oleh gateway Midtrans.'
WHERE instructions = 'Pembayaran diverifikasi otomatis oleh gateway pembayaran.';
