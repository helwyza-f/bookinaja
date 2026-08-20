-- Kolom updated_at pada tenants sudah dirujuk kode (SetTenantPublished,
-- SET referral_code) tapi tak pernah dibuat migrasi — akibatnya UPDATE yang
-- menyetel updated_at gagal ("column updated_at does not exist"), mis. saat
-- owner menekan "Terbitkan bisnis". Tambahkan kolomnya (idempoten).

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Selaraskan baris lama dengan created_at supaya nilainya masuk akal.
UPDATE tenants SET updated_at = created_at WHERE updated_at < created_at;
