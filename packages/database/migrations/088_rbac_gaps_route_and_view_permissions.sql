-- =============================================================================
-- Migration: 088 — RBAC Gap Fix: route permissions + financial/maint:view gaps
-- Context : V.78.101.24 added requirePermission guards to all routes.
--           This migration closes three blockers found in local DB audit:
--
--   1. route:view / route:write never existed in permissions table
--      → all non-master users get 403 on /routes, /unit-logs, /incidents
--
--   2. financial:view only assigned to Master (id=0)
--      → all other roles have financial:write but not financial:view
--      → 403 on GET /finance/dashboard and GET /finance/transactions
--
--   3. Operador de Unidad has maint:write but not maint:view
--      → plugin-level maint:view hook blocks all maintenance endpoints
--
-- Idempotent: INSERT IGNORE throughout.
-- =============================================================================

-- ─── 1. Add route permissions to catalog ─────────────────────────────────────

INSERT IGNORE INTO permissions (slug, description) VALUES
  ('route:view',  'Ver rutas, bitácora de despacho e incidentes'),
  ('route:write', 'Iniciar/cerrar rutas y reportar incidentes');

-- ─── 2. Assign route:view to ALL operational roles ───────────────────────────
-- Every authenticated user needs read access to routes/unit-logs.

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.slug = 'route:view'
  AND r.id NOT IN (0);   -- Master gets * bypass, no entry needed

-- ─── 3. Assign route:write to dispatch/management roles ──────────────────────
-- Gerente General (1), Superintendente de Mina (2),
-- Planeador Sr (4), Operador de Unidad (6)
-- Técnico (5) and Jefe de Mto. (3) are excluded: they don't drive.

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.slug = 'route:write'
  AND r.id IN (1, 2, 4, 6);

-- ─── 4. Add financial:view to every role that already has financial:write ─────
-- Migration 086 added financial:write to all roles but missed financial:view.

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT rp_write.role_id, p_view.id
FROM role_permissions rp_write
JOIN permissions p_write  ON p_write.id    = rp_write.permission_id
                          AND p_write.slug  = 'financial:write'
JOIN permissions p_view   ON p_view.slug   = 'financial:view'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp_check
  WHERE rp_check.role_id        = rp_write.role_id
    AND rp_check.permission_id  = p_view.id
);

-- ─── 5. Add maint:view to Operador de Unidad (id=6) ──────────────────────────
-- Has maint:write but plugin-level maint:view hook blocks all maintenance GETs.

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 6, p.id
FROM permissions p
WHERE p.slug = 'maint:view';
