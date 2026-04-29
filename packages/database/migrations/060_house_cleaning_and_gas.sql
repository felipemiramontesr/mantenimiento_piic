-- 🔱 ARCHON HOUSE CLEANING & GAS ALIGNMENT v.1.0
-- Logic: Merging duplicate catalogs and enforcing relational standards.
-- Purpose: Data Integrity and Performance Optimization.
-- Architecture: Sovereing Data Infrastructure (v.41.8.0)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. DEPARTMENT UNIFICATION (Merge V2 onto Master)
-- Relaciones Comunitarias: 1014 -> 310
UPDATE fleet_units SET department_id = 310 WHERE department_id = 1014;
-- Seguridad Patrimonial: 1025 -> 311
UPDATE fleet_units SET department_id = 311 WHERE department_id = 1025;

-- 2. DELETE DEPRECATED DEPARTMENT ENTRIES
DELETE FROM common_catalogs WHERE id IN (1014, 1025);

-- 3. PURGE ACCIDENTAL CATEGORIES (Correction Layer)
DELETE FROM common_catalogs WHERE category = 'FUEL_TYPE';

-- 4. GAS LP INTEGRATION (Correct Category: FUEL)
INSERT INTO common_catalogs (category, code, label, is_active, created_at)
SELECT 'FUEL', 'F_LP_GAS', 'Gas LP / Natural', 1, NOW()
FROM (SELECT 1) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM common_catalogs WHERE code = 'F_LP_GAS' AND category = 'FUEL');

-- 5. STANDARDIZE OPERATIONAL USE (Optional but recommended)
-- Note: Operational use was recently split into 'operational_use' category. 
-- We ensure no fleet_unit is left pointing to the old 'USE_TYPE' if duplicates exist.

SET FOREIGN_KEY_CHECKS = 1;
