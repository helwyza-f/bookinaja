ALTER TABLE workspace_memberships
    ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

UPDATE workspace_memberships wm
SET admin_user_id = w.owner_user_id
FROM workspaces w
WHERE wm.workspace_id = w.id
  AND wm.admin_user_id IS NULL
  AND w.owner_user_id IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM workspace_memberships
        WHERE admin_user_id IS NULL
    ) THEN
        ALTER TABLE workspace_memberships
            ALTER COLUMN admin_user_id SET NOT NULL;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_workspace_memberships_admin_user
    ON workspace_memberships (workspace_id, admin_user_id)
    WHERE admin_user_id IS NOT NULL;
