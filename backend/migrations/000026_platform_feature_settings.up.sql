CREATE TABLE IF NOT EXISTS platform_feature_settings (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_feature_settings (key, value_json)
VALUES (
  'discovery_feed',
  jsonb_build_object(
    'enable_discovery_posts',
    false
  )
)
ON CONFLICT (key) DO NOTHING;
