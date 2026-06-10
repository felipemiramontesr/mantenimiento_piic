SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 095 — Business Role Restructure (8 Operational Roles)
-- Context : Replaces 6 placeholder roles (Gerente General … Operador de Unidad)
--           with 8 business roles aligned to sidebar modules.
--           Feature Contract approved by GrayMan 2026-06-10.
--           CC + AG consensus on mapeo rol → permisos.
-- Guard   : ARCHON (id=0) and GrayMan (id=4) are NEVER touched.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1 — Delete non-GrayMan users
--   CASCADE on user_roles FK (fk_ur_user) cleans user_roles automatically.
--   users.role_id FK to roles has no CASCADE — users must be deleted BEFORE roles.
-- -----------------------------------------------------------------------------
DELETE FROM users WHERE id != 4;

-- -----------------------------------------------------------------------------
-- STEP 2 — Clean role_permissions for non-Archon roles
-- -----------------------------------------------------------------------------
DELETE FROM role_permissions WHERE role_id != 0;

-- -----------------------------------------------------------------------------
-- STEP 3 — Delete placeholder roles (ids 1–6)
--   Safe: no users reference them after STEP 1.
--   role_permissions CASCADE already cleaned in STEP 2.
-- -----------------------------------------------------------------------------
DELETE FROM roles WHERE id != 0;

-- -----------------------------------------------------------------------------
-- STEP 4 — Insert 8 business roles (explicit IDs 1–8, INSERT IGNORE = idempotent)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO roles (id, name) VALUES
  (1, 'Operador General'),
  (2, 'Supervisor de Mantenimiento'),
  (3, 'Director de Finanzas'),
  (4, 'Gestor de Flotilla'),
  (5, 'Planificador de Rutas'),
  (6, 'Supervisor de Tránsito'),
  (7, 'Administrador de RRHH'),
  (8, 'Administrador de TI');

-- -----------------------------------------------------------------------------
-- STEP 5 — Assign permissions per role (INSERT IGNORE = idempotent via PK)
-- -----------------------------------------------------------------------------

-- 1. Operador General — dashboard read-only across modules
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE slug IN (
  'fleet:view', 'maint:view', 'route:view', 'financial:view'
);

-- 2. Supervisor de Mantenimiento — full maint write + fleet/route read + export
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE slug IN (
  'fleet:view', 'maint:view', 'maint:write', 'route:view', 'report:export'
);

-- 3. Director de Finanzas — full financial + fleet context read
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE slug IN (
  'financial:view', 'financial:write', 'financial:report', 'report:export', 'fleet:view'
);

-- 4. Gestor de Flotilla — full fleet CRUD + export
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE slug IN (
  'fleet:view', 'fleet:write', 'fleet:delete', 'report:export'
);

-- 5. Planificador de Rutas — fleet read + full route write + export
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE slug IN (
  'fleet:view', 'route:view', 'route:write', 'report:export'
);

-- 6. Supervisor de Tránsito / Gestor de Incidencias — route write + maint context
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions WHERE slug IN (
  'fleet:view', 'route:view', 'route:write', 'maint:view'
);

-- 7. Administrador de RRHH — user management + fleet read (context for assignments)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions WHERE slug IN (
  'user:admin', 'fleet:view'
);

-- 8. Administrador de TI — system roles + broad read access across all modules
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 8, id FROM permissions WHERE slug IN (
  'system:manage_roles', 'user:admin', 'fleet:view', 'maint:view', 'route:view', 'financial:view'
);
