CREATE TABLE IF NOT EXISTS tenant_posts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'photo',
    title TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    cover_media_url TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT NOT NULL DEFAULT '',
    cta TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    visibility TEXT NOT NULL DEFAULT 'feed',
    starts_at TIMESTAMPTZ NULL,
    ends_at TIMESTAMPTZ NULL,
    published_at TIMESTAMPTZ NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_posts_tenant_status_created_at
ON tenant_posts (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_posts_visibility_published_at
ON tenant_posts (visibility, published_at DESC);
