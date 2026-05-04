ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS landing_page_config JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS landing_theme_config JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS booking_form_config JSONB NOT NULL DEFAULT '{}'::jsonb;
