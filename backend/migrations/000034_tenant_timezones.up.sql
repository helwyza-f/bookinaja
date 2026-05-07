ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta';

UPDATE tenants
SET timezone = 'Asia/Jakarta'
WHERE COALESCE(NULLIF(BTRIM(timezone), ''), '') = '';
