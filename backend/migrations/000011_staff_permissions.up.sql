-- =============================================================================
-- MIGRATION: 000011_staff_permissions.up.sql
-- DESCRIPTION: Permission matrix for tenant staff
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_permissions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user
    ON user_permissions(user_id);

