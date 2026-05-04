ALTER TABLE tenants
DROP COLUMN IF EXISTS booking_form_config,
DROP COLUMN IF EXISTS landing_theme_config,
DROP COLUMN IF EXISTS landing_page_config;
