ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS discovery_headline TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS discovery_subheadline TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS discovery_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS discovery_badges TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS promo_label TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS featured_image_url TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS highlight_copy TEXT DEFAULT '';
