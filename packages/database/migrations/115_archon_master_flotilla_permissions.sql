-- ============================================================
-- Migration 115: Archon Master — Flotilla Permissions
-- Context: Hardening & Security Audit
--          Grants full operational permissions to Propietario de Flotilla (role_id = 1)
--          allowing them to see and manage all modules.
-- Idempotent: safe to run multiple times (INSERT IGNORE)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── Grant permissions to role 1 ──────────────────────────────
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
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
