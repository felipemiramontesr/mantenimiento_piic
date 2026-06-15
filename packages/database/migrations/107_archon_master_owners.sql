-- ============================================================
-- Migration 107: Archon Master — owners table
-- Context: FC Archon_Master_Fase1_Identity_Foundation
--          Creates dedicated multi-tenant owners table and migrates
--          existing FLEET_OWNER entries from common_catalogs preserving IDs.
-- Idempotent: safe to run multiple times (CREATE TABLE IF NOT EXISTS, INSERT IGNORE)
-- GrayMan applies via phpMyAdmin. No SET FOREIGN_KEY_CHECKS needed here since
-- owners has no FK outgoing — only receives FKs from other tables.
-- ============================================================

SET NAMES utf8mb4;

-- Step 1: Create owners table (no AUTO_INCREMENT — IDs sourced from common_catalogs)
CREATE TABLE IF NOT EXISTS owners (
  id          INT NOT NULL,
  owner_type  ENUM('FLOTILLA', 'PRIVATE') NOT NULL DEFAULT 'FLOTILLA',
  label       VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Migrate existing FLEET_OWNER entries preserving original IDs
-- (Arian Silver, Huur, etc. keep their numeric IDs so fleet_units.ownerId stays valid)
INSERT IGNORE INTO owners (id, owner_type, label, created_at)
SELECT id, 'FLOTILLA', label, created_at
FROM common_catalogs
WHERE category = 'FLEET_OWNER';

-- Verification query (run manually after applying to confirm):
-- SELECT o.id, o.owner_type, o.label FROM owners o;
