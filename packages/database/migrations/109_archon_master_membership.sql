-- ============================================================
-- Migration 109: Archon Master — user_owner_membership table
-- Context: FC Archon_Master_Fase1_Identity_Foundation
--          Replaces user_fleet_owners with richer membership model.
--          Supports familiar_type (PRIVATE sub-users) and area_id (FLOTILLA sub-users).
-- Idempotent: safe to run multiple times (CREATE TABLE IF NOT EXISTS, INSERT IGNORE)
-- Run AFTER migration 108 (requires areas table).
-- ============================================================

SET NAMES utf8mb4;

-- Step 1: Create user_owner_membership table
CREATE TABLE IF NOT EXISTS user_owner_membership (
  id            INT NOT NULL AUTO_INCREMENT,
  user_id       INT NOT NULL,
  owner_id      INT NOT NULL,
  familiar_type ENUM('PAREJA', 'HIJO_A') NULL,
  area_id       INT NULL,
  assigned_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_uom_user_owner (user_id, owner_id),
  CONSTRAINT fk_uom_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_uom_owner FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
  CONSTRAINT fk_uom_area  FOREIGN KEY (area_id)  REFERENCES areas(id)  ON DELETE SET NULL,
  INDEX idx_uom_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Migrate existing user_fleet_owners rows that have a matching owner in the owners table
-- (INNER JOIN ensures we only migrate rows whose owner was successfully migrated in migration 107)
INSERT IGNORE INTO user_owner_membership (user_id, owner_id, assigned_at)
SELECT ufo.user_id, ufo.owner_id, ufo.assigned_at
FROM user_fleet_owners ufo
INNER JOIN owners o ON o.id = ufo.owner_id;

-- Verification (run manually after applying):
-- SELECT uom.user_id, uom.owner_id, o.label FROM user_owner_membership uom JOIN owners o ON o.id = uom.owner_id;
