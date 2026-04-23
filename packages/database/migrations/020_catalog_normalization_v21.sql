-- =============================================================================
-- Migration: 020 - Archon Sovereign Catalog Normalization
-- Architecture: Silicon Valley Standard (Deterministic Hierarchy)
-- Version: 21.0.0
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 🔱 1. CLEANUP & NORMALIZATION
-- We ensure all core asset types have standardized codes before reconstruction.
UPDATE common_catalogs SET code = 'AT_VEH' WHERE category = 'ASSET_TYPE' AND (label LIKE '%Vehiculo%' OR label LIKE '%Vehículo%');
UPDATE common_catalogs SET code = 'AT_MAQ' WHERE category = 'ASSET_TYPE' AND (label LIKE '%Maquinaria%');
UPDATE common_catalogs SET code = 'AT_HER' WHERE category = 'ASSET_TYPE' AND (label LIKE '%Herramienta%');

-- 🔱 2. HIERARCHICAL RECONSTRUCTION (Deterministic)
-- We use a cross-join pattern to link brands and models based on codes, not IDs.
-- This ensures that even if IDs shifted in Hostinger, the logic holds.

-- A) Link BRANDS to ASSET_TYPES
UPDATE common_catalogs b
SET b.parent_id = (SELECT id FROM (SELECT id, code FROM common_catalogs) AS root WHERE root.code = 'AT_VEH')
WHERE b.category = 'BRAND' 
AND b.code IN ('B_NISSAN', 'B_TOYOTA', 'B_FORD', 'B_CHEVROLET', 'B_VW', 'B_HONDA', 'B_HYUNDAI');

UPDATE common_catalogs b
SET b.parent_id = (SELECT id FROM (SELECT id, code FROM common_catalogs) AS root WHERE root.code = 'AT_MAQ')
WHERE b.category = 'BRAND' 
AND b.code IN ('B_CAT', 'B_KOM', 'B_JOHNDEERE', 'B_CASE', 'B_BOBCAT');

UPDATE common_catalogs b
SET b.parent_id = (SELECT id FROM (SELECT id, code FROM common_catalogs) AS root WHERE root.code = 'AT_HER')
WHERE b.category = 'BRAND' 
AND b.code IN ('B_MILWAUKEE', 'B_DEWALT', 'B_MAKITA', 'B_BOSCH');

-- B) Link MODELS to BRANDS
-- Standard Nissan Lineup
UPDATE common_catalogs m
SET m.parent_id = (SELECT id FROM (SELECT id, code FROM common_catalogs) AS brands WHERE brands.code = 'B_NISSAN')
WHERE m.category = 'MODEL' AND m.code IN ('M_TSURU', 'M_NP300', 'M_SENTRA', 'M_MARCH', 'M_VERSA');

-- Standard Toyota Lineup
UPDATE common_catalogs m
SET m.parent_id = (SELECT id FROM (SELECT id, code FROM common_catalogs) AS brands WHERE brands.code = 'B_TOYOTA')
WHERE m.category = 'MODEL' AND m.code IN ('M_HILUX', 'M_TACOMA', 'M_HIACE', 'M_COROLLA');

-- Standard Ford Lineup
UPDATE common_catalogs m
SET m.parent_id = (SELECT id FROM (SELECT id, code FROM common_catalogs) AS brands WHERE brands.code = 'B_FORD')
WHERE m.category = 'MODEL' AND m.code IN ('M_F150', 'M_RANGER', 'M_TRANSIT', 'M_LOBO');

-- 🔱 3. INTEGRITY AUDIT
-- Deactivate any catalog item that managed to stay orphan after this standardized run.
-- This prevents the UI from showing "dead" options.
-- UPDATE common_catalogs SET is_active = FALSE WHERE category IN ('BRAND', 'MODEL') AND parent_id IS NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- NORMALIZATION COMPLETE: Data Standardized v.21.0.0
-- =============================================================================
