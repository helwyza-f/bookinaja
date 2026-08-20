-- Gerbang publikasi tenant: tenant hanya tampil di sisi customer (direktori,
-- landing, booking publik) setelah owner menekan "Terbitkan". Tenant baru mulai
-- tidak terbit; tenant lama di-backfill terbit agar tak tiba-tiba tersembunyi.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

-- Backfill: semua tenant yang sudah ada saat migrasi ini dianggap sudah publik
-- (mereka memang sudah tampil sebelum gerbang diperkenalkan).
UPDATE tenants SET is_published = true;
