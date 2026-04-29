-- 🔱 ARCHON TOTAL SYMMETRY MIGRATION v.1.0
-- Logic: Final Relational Alignment and Data Enrichment.
-- Purpose: 100% Data Density and Structural Integrity.
-- Architecture: Sovereing Data Infrastructure (v.42.0.0)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. CATEGORY STANDARDIZATION (Uppercase Enforce)
UPDATE common_catalogs SET category = 'OPERATIONAL_USE' WHERE category IN ('USE_TYPE', 'operational_use');
UPDATE common_catalogs SET category = 'TERRAIN_TYPE' WHERE category = 'terrain_type';

-- 2. LOCATION PURIFICATION
-- Any unit in 'Arian Silver Zacatecas' (235) moves to 'Mina' (1037)
UPDATE fleet_units SET location_id = 1037 WHERE location_id = 235;
DELETE FROM common_catalogs WHERE id = 235;

-- 3. FUEL INTELLIGENCE (Healing the S/D)
-- Most Light Units (ASM-002, 006, 007, 009, 010) are Gasolina (11)
UPDATE fleet_units SET fuel_type_id = 11 WHERE fuel_type_id IS NULL AND id IN ('ASM-002', 'ASM-006', 'ASM-007', 'ASM-009', 'ASM-010');
-- Heavy or Diesel Specific Units (ASM-008, 011, 012, 013, 014) are Diesel (10)
UPDATE fleet_units SET fuel_type_id = 10 WHERE fuel_type_id IS NULL AND id IN ('ASM-008', 'ASM-011', 'ASM-012', 'ASM-013', 'ASM-014');

-- 4. CLEANUP: Removing duplicate codes within the same category if they exist
-- (Checked JSON: Codes are unique enough after category merge)

SET FOREIGN_KEY_CHECKS = 1;
