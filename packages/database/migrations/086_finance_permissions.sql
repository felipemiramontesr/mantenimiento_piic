-- =============================================================================
-- Migration: 086 — Finance Module: RBAC Permissions
-- Adds financial:write and financial:report permissions.
-- Assigns all permissions to all existing roles for Phase 1 testing.
-- NOTE: Permissions will be scoped per-role at client go-live (hardening phase).
-- Idempotent: INSERT IGNORE throughout.
-- =============================================================================

INSERT IGNORE INTO permissions (slug, description) VALUES
  ('financial:write',  'Registrar y editar transacciones financieras'),
  ('financial:report', 'Exportar reportes financieros en CSV');

-- Assign financial:write and financial:report to ALL roles (Phase 1 testing scope)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.slug IN ('financial:write', 'financial:report');
