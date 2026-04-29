-- 🔱 ARCHON SYMMETRY GOLD v.1.0
-- Logic: Clarifying Owner vs Location and unifying operational categories.
-- Purpose: 100% Structural Precision.
-- Architecture: Sovereing Data Infrastructure (v.41.10.0)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. UNIFY OPERATIONAL USE CATEGORIES
-- Rename 'operational_use' to standard uppercase 'OPERATIONAL_USE'
UPDATE common_catalogs SET category = 'OPERATIONAL_USE' WHERE category IN ('USE_TYPE', 'operational_use');

-- 2. LOCATION CLEANUP (Removing Company from Location list)
-- If any unit was pointing to LOC_ASZ (235), we move it to a generic physical location or NULL
-- In the JSON audit, units are already using 1037/1038, so we safe-delete 235.
DELETE FROM common_catalogs WHERE id = 235;

-- 3. ENSURE FLEET OWNERS ARE ACTIVE AND CORRECT
UPDATE common_catalogs SET label = 'Arian Silver de México' WHERE code = 'OWN_AS';
UPDATE common_catalogs SET label = 'Huur' WHERE code = 'OWN_HU';

-- 4. MASS FUEL DATA INJECTION (Based on Fleet Intelligence)
-- ASM-002 (Hilux 2007) -> Diesel (ID 10)
UPDATE fleet_units SET fuel_type_id = 10 WHERE id = 'ASM-002' AND fuel_type_id IS NULL;
-- ASM-006 (NP300 2016) -> Gasolina (ID 11)
UPDATE fleet_units SET fuel_type_id = 11 WHERE id = 'ASM-006' AND fuel_type_id IS NULL;
-- ASM-007 (NP300 2016) -> Gasolina (ID 11)
UPDATE fleet_units SET fuel_type_id = 11 WHERE id = 'ASM-007' AND fuel_type_id IS NULL;
-- ASM-008 (Hilux 2019) -> Diesel (ID 10)
UPDATE fleet_units SET fuel_type_id = 10 WHERE id = 'ASM-008' AND fuel_type_id IS NULL;
-- ASM-011 (RAM 4000) -> Gasolina (ID 11)
UPDATE fleet_units SET fuel_type_id = 11 WHERE id = 'ASM-011' AND fuel_type_id IS NULL;
-- ASM-012/13/14 (Mitsubishi L200) -> Diesel (ID 10)
UPDATE fleet_units SET fuel_type_id = 10 WHERE id IN ('ASM-012', 'ASM-013', 'ASM-014') AND fuel_type_id IS NULL;

SET FOREIGN_KEY_CHECKS = 1;
