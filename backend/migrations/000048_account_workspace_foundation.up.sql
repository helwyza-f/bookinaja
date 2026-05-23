CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    google_subject TEXT UNIQUE,
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_tenant_email_lower
    ON users (tenant_id, LOWER(email))
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    business_category VARCHAR(80) NOT NULL DEFAULT 'gaming_hub',
    business_type VARCHAR(120) NOT NULL DEFAULT '',
    status VARCHAR(40) NOT NULL DEFAULT 'onboarding',
    plan VARCHAR(40) NOT NULL DEFAULT 'trial',
    subscription_status VARCHAR(40) NOT NULL DEFAULT 'trial',
    timezone VARCHAR(80) NOT NULL DEFAULT 'Asia/Jakarta',
    whatsapp_number VARCHAR(30) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL DEFAULT 'owner',
    permission_keys TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(account_id, workspace_id),
    UNIQUE(workspace_id, admin_user_id)
);

CREATE TABLE IF NOT EXISTS workspace_onboarding_states (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    current_step VARCHAR(80) NOT NULL DEFAULT 'workspace',
    completed_steps TEXT[] NOT NULL DEFAULT '{}',
    selected_start_mode VARCHAR(80) NOT NULL DEFAULT '',
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_onboarding_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_key VARCHAR(120) NOT NULL,
    step_key VARCHAR(120) NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_account
    ON workspace_memberships(account_id, status);

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_workspace
    ON workspace_memberships(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_workspace_onboarding_events_workspace
    ON workspace_onboarding_events(workspace_id, created_at DESC);
