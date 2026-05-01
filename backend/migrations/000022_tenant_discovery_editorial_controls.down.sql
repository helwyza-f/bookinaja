ALTER TABLE tenants
    DROP COLUMN IF EXISTS promo_ends_at,
    DROP COLUMN IF EXISTS promo_starts_at,
    DROP COLUMN IF EXISTS discovery_promoted,
    DROP COLUMN IF EXISTS discovery_featured;
