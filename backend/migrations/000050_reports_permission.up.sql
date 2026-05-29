-- =============================================================================
-- MIGRATION: 000050_reports_permission.up.sql
-- DESCRIPTION: Add dedicated reports permission to existing admin operational roles
-- =============================================================================

UPDATE staff_roles
SET permission_keys = permission_keys || ARRAY['reports.read']::TEXT[],
    updated_at = NOW()
WHERE name = 'Admin Operasional'
  AND NOT ('reports.read' = ANY(permission_keys));
