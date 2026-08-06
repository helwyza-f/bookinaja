-- Netralkan ulang label metode gateway. Migration 000054 hanya memperbaiki
-- baris yang ada saat itu; tenant yang di-seed setelahnya (sebelum kode seed
-- diperbaiki) kembali memakai teks "Midtrans". Rapikan sisa baris tersebut.
UPDATE tenant_payment_methods
SET display_name = 'Pembayaran Online (QRIS, VA, E-wallet)'
WHERE display_name = 'Midtrans / QRIS Gateway';

UPDATE tenant_payment_methods
SET instructions = 'Pembayaran diverifikasi otomatis oleh gateway pembayaran.'
WHERE instructions IN (
  'Pembayaran diverifikasi otomatis oleh gateway Midtrans.',
  'Pembayaran diverifikasi otomatis oleh Midtrans.'
);
