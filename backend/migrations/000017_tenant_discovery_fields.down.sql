ALTER TABLE tenants
    DROP COLUMN IF EXISTS highlight_copy,
    DROP COLUMN IF EXISTS featured_image_url,
    DROP COLUMN IF EXISTS promo_label,
    DROP COLUMN IF EXISTS discovery_badges,
    DROP COLUMN IF EXISTS discovery_tags,
    DROP COLUMN IF EXISTS discovery_subheadline,
    DROP COLUMN IF EXISTS discovery_headline;
