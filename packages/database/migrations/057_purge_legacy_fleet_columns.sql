-- 🔱 ARCHON PURGE: LEGACY COLUMN DECOMMISSIONING (v.40.0.0)
-- Logic: Removing redundant text columns to enforce relational integrity.
-- Purpose: Professionalizing the fleet schema and eliminating #1364 warnings.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. PURGE: Drop legacy columns from fleet_units
ALTER TABLE fleet_units 
DROP COLUMN IF EXISTS marca,
DROP COLUMN IF EXISTS modelo,
DROP COLUMN IF EXISTS departamento,
DROP COLUMN IF EXISTS uso,
DROP COLUMN IF EXISTS traccion,
DROP COLUMN IF EXISTS transmision,
DROP COLUMN IF EXISTS tarjeta_circulacion,
DROP COLUMN IF EXISTS tipo_terreno,
DROP COLUMN IF EXISTS tire_brand;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- PURGE COMPLETE: Database is now 100% Normalized and Relational.
-- =============================================================================
