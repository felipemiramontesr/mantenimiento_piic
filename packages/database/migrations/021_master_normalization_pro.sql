-- =============================================================================
-- Migration: 021 - Master Database Purge & Pro Normalization
-- Architecture: Archon Sovereign v21.5.0
-- Goal: Eliminate duplicates, consolidate categories, and ensure deterministic data.
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. CONSOLIDATE FUEL TYPES (Merge F_DSL into F_DIESEL, etc.)
-- Winner: F_DIESEL (ID 10), F_GAS (ID 11), F_ELEC (ID 12)
UPDATE fleet_units SET fuel_type_id = 10 WHERE fuel_type_id IN (18);
UPDATE fleet_units SET fuel_type_id = 12 WHERE fuel_type_id IN (19);
DELETE FROM common_catalogs WHERE id IN (18, 19);

-- 2. CONSOLIDATE DRIVE TYPES (Merge duplicates)
-- Winner: DR_4X2 (ID 20), DR_4X4 (ID 21), DR_AWD (ID 22)
UPDATE fleet_units SET traccion_id = 21 WHERE traccion_id IN (210);
DELETE FROM common_catalogs WHERE id IN (210);

-- 3. CONSOLIDATE FREQUENCIES
-- We will merge MAINT_FREQ_TIME into FREQ_TIME for consistency
-- Winner: T_MENSUAL (ID 6), T_TRIMEST (ID 7)
UPDATE fleet_units SET maintenance_time_freq_id = 6 WHERE maintenance_time_freq_id = 41;
UPDATE fleet_units SET maintenance_time_freq_id = 7 WHERE maintenance_time_freq_id = 40;
DELETE FROM common_catalogs WHERE category = 'MAINT_FREQ_TIME';

-- 4. CLEAN UP DUPLICATE BRANDS AND MODELS
-- Ensure all brands point to the correct Asset Type (AT_VEH = 1)
UPDATE common_catalogs SET parent_id = 1 WHERE category = 'BRAND' AND parent_id != 1 AND parent_id IS NOT NULL;

-- Remove specific duplicates found in JSON (Nissan common_catalogs)
DELETE FROM common_catalogs WHERE category = 'MODEL' AND code IN ('M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9') AND parent_id = 23;
-- Keep the more descriptive ones (codes starting with M_NP300, etc.)

-- 5. STANDARDIZE CATEGORY NAMES
-- Ensure everything is uppercase and trimmed
UPDATE common_catalogs SET category = UPPER(TRIM(category));

-- 6. ENSURE CANONICAL CODES
UPDATE common_catalogs SET code = 'AT_VEH' WHERE category = 'ASSET_TYPE' AND (label LIKE '%Vehiculo%' OR code = 'VEH');
UPDATE common_catalogs SET code = 'AT_MAQ' WHERE category = 'ASSET_TYPE' AND (label LIKE '%Maquinaria%' OR code = 'MAQ');
UPDATE common_catalogs SET code = 'AT_HER' WHERE category = 'ASSET_TYPE' AND (label LIKE '%Herramienta%' OR code = 'HER');

-- 7. REMOVE INACTIVE OR ORPHANED SNEAKY DUPLICATES
DELETE t1 FROM common_catalogs t1
INNER JOIN common_catalogs t2 
WHERE t1.id > t2.id 
  AND t1.category = t2.category 
  AND (t1.code = t2.code OR t1.label = t2.label)
  AND t1.category NOT IN ('BRAND', 'MODEL'); -- Brands/Models need special care, others are safe to purge by code/label

SET FOREIGN_KEY_CHECKS = 1;

-- Verification of the new Clean State
SELECT category, COUNT(*), GROUP_CONCAT(label) 
FROM common_catalogs 
GROUP BY category;
