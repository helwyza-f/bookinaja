DROP TABLE IF EXISTS workspace_onboarding_events;
DROP TABLE IF EXISTS workspace_onboarding_states;
DROP TABLE IF EXISTS workspace_memberships;
DROP TABLE IF EXISTS workspaces;
DROP TABLE IF EXISTS accounts;
DROP INDEX IF EXISTS uniq_users_tenant_email_lower;
ALTER TABLE users
    ADD CONSTRAINT users_email_key UNIQUE (email);
