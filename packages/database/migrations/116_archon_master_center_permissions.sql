-- ============================================================
-- Migration 116: Archon Master — Centro Especializado Permissions
-- Context: Fase 9 — Centro Especializado must access all panels
--          Grants full operational permissions to Centro Especializado (role_id = 3)
--          matching the same set as Propietario de Flotilla (role_id = 1, migration 115).
--          fleet:scoped ensures multi-tenant isolation remains active (resolveOwnerScope).
-- Idempotent: safe to run multiple times (INSERT IGNORE)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── Grant permissions to role 3 ──────────────────────────────
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE slug IN (
  'fleet:write',
  'fleet:delete',
  'fleet:scoped',
  'financial:view',
  'financial:write',
  'route:view',
  'route:write',
  'user:admin'
);

SET FOREIGN_KEY_CHECKS = 1;
