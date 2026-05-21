DROP INDEX IF EXISTS uniq_workspace_memberships_admin_user;

ALTER TABLE workspace_memberships
    DROP COLUMN IF EXISTS admin_user_id;
