-- ============================================================
-- Migration 110: Archon Master — fleet_units.ownerId index for owners table
-- Context: FC Archon_Master_Fase1_Identity_Foundation
--          Ensures query performance for the new JOIN on owners table.
--          fleet_units.ownerId has no existing FK constraint (common_catalogs
--          does not use AUTO_INCREMENT so no FK was defined in prior migrations).
--          This migration adds a named index for the new JOIN pattern.
-- Idempotent: CREATE INDEX IF NOT EXISTS (MySQL 8.0+)
-- ============================================================

SET NAMES utf8mb4;

-- Add performance index for fleet_units.ownerId → owners JOIN
-- (replaces the implicit table-scan JOIN against common_catalogs with category filter)
ALTER TABLE fleet_units
  ADD INDEX IF NOT EXISTS idx_fleet_units_owner_id (ownerId);

-- Note: GrayMan may want to verify referential integrity after applying 107–109:
-- SELECT COUNT(*) FROM fleet_units f LEFT JOIN owners o ON o.id = f.ownerId
-- WHERE f.ownerId IS NOT NULL AND o.id IS NULL;
-- Expected result: 0 (all ownerId values exist in owners table)
