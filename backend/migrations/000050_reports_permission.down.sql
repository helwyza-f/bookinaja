-- =============================================================================
-- MIGRATION: 000050_reports_permission.down.sql
-- DESCRIPTION: Remove dedicated reports permission from default admin operational roles
-- =============================================================================

UPDATE staff_roles
SET permission_keys = array_remove(permission_keys, 'reports.read'),
    updated_at = NOW()
WHERE name = 'Admin Operasional'
  AND 'reports.read' = ANY(permission_keys);
