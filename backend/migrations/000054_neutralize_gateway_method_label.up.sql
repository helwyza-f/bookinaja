-- Buat label metode gateway netral (gateway aktif kini ditentukan platform,
-- bukan selalu Midtrans). Hanya ubah baris yang masih memakai teks default lama.
UPDATE tenant_payment_methods
SET display_name = 'Pembayaran Online (QRIS, VA, E-wallet)'
WHERE display_name = 'Midtrans / QRIS Gateway';

UPDATE tenant_payment_methods
SET instructions = 'Pembayaran diverifikasi otomatis oleh gateway pembayaran.'
WHERE instructions = 'Pembayaran diverifikasi otomatis oleh gateway Midtrans.';
