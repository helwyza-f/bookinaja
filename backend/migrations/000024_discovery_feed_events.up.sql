CREATE TABLE IF NOT EXISTS discovery_feed_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    surface TEXT NOT NULL,
    section_id TEXT NOT NULL DEFAULT '',
    card_variant TEXT NOT NULL DEFAULT '',
    position_index INTEGER NOT NULL DEFAULT 0,
    session_id TEXT NOT NULL DEFAULT '',
    promo_label TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_feed_events_tenant_created_at
    ON discovery_feed_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discovery_feed_events_type_created_at
    ON discovery_feed_events (event_type, created_at DESC);
