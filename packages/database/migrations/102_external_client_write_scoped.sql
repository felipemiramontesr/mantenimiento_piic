SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 102 — External Client Scoped Write Access (Phase F1-A extension)
-- Context : GrayMan confirmed 2026-06-12: rol 9 (Cliente Externo) should be
--           able to PATCH their own vehicles (odometry, insurance, circulation
--           card) but NOT create (POST) or delete new fleet units.
--           New permission `fleet:write:scoped` enables PATCH-only on owned
--           units. Anti-IDOR enforced server-side via owner scope resolution.
-- Guard   : POST and DELETE remain gated to `fleet:write` (roles 0-4 only).
-- Idempotent: safe to run multiple times (INSERT IGNORE).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1 — New scoped-write permission (PATCH-only, owner-validated)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO permissions (slug, description) VALUES
  ('fleet:write:scoped', 'Actualización de datos propios de unidades de flota (odometría, seguro, tarjeta de circulación)');

-- -----------------------------------------------------------------------------
-- STEP 2 — Grant fleet:write:scoped to role 9 (Cliente Externo)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 9, id FROM permissions WHERE slug = 'fleet:write:scoped';
