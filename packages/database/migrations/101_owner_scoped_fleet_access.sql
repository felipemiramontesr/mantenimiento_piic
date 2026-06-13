SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 101 — Owner-Scoped Fleet Access (Phase F1-A: External Client role)
-- Context : Feature Contract "Owner_Scoped_Fleet_Access_External_Client"
--           signed by GrayMan 2026-06-12. CC + AG consensus on v2 design.
--           FLEET_OWNER catalog becomes the owner registry (companies and
--           private clients by name). Users link to 1..N owners through
--           user_fleet_owners; carriers of fleet:scoped only see fleet units
--           whose ownerId belongs to their linked owners (deny-by-default).
-- Guard   : Roles 0-8 are NOT touched in this phase. Role 4 transformation
--           (write scoping) belongs to Phase F1-B in a separate migration.
-- Idempotent: safe to run multiple times (IF NOT EXISTS / INSERT IGNORE).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1 — Link table: which fleet owners a user is bound to (M:N)
--   PK (user_id, owner_id) deduplicates links natively.
--   CASCADE cleans links when a user or a catalog owner row is removed.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_fleet_owners (
  user_id     INT NOT NULL,
  owner_id    INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, owner_id),
  CONSTRAINT fk_ufo_user  FOREIGN KEY (user_id)  REFERENCES users(id)           ON DELETE CASCADE,
  CONSTRAINT fk_ufo_owner FOREIGN KEY (owner_id) REFERENCES common_catalogs(id) ON DELETE CASCADE,
  INDEX idx_ufo_owner (owner_id)
);

-- -----------------------------------------------------------------------------
-- STEP 2 — Marker permission: fleet access restricted to linked owners
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO permissions (slug, description) VALUES
  ('fleet:scoped', 'Acceso a flota restringido a las unidades de los propietarios asignados al usuario');

-- -----------------------------------------------------------------------------
-- STEP 3 — Role 9: Cliente Externo (read-only, owner-scoped)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO roles (id, name) VALUES
  (9, 'Cliente Externo');

-- -----------------------------------------------------------------------------
-- STEP 4 — Role 9 permissions: exactly fleet:view + fleet:scoped. Nothing else.
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 9, id FROM permissions WHERE slug IN ('fleet:view', 'fleet:scoped');
