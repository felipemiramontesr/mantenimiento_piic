-- =============================================================================
-- Migration: 019 - Catalog Hierarchical Reconciliation v.2
-- Architecture: Archon Collective v.18.9.5
-- Goal: Fix broken parent_id relationships caused by hardcoded IDs in migration 007.
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. IDENTIFY ROOT IDs
SET @at_veh_id = (SELECT id FROM common_catalogs WHERE category = 'ASSET_TYPE' AND code = 'AT_VEH' LIMIT 1);
SET @at_maq_id = (SELECT id FROM common_catalogs WHERE category = 'ASSET_TYPE' AND code = 'AT_MAQ' LIMIT 1);
SET @at_her_id = (SELECT id FROM common_catalogs WHERE category = 'ASSET_TYPE' AND code = 'AT_HER' LIMIT 1);

-- 2. REPAIR BRANDS (Link them to their correct Asset Type parents)
-- We use code-based matching since IDs might have shifted in Hostinger.

-- All brands previously hardcoded to 1, now linked to real Vehiculo ID
UPDATE common_catalogs 
SET parent_id = @at_veh_id 
WHERE category = 'BRAND' 
AND (parent_id = 1 OR parent_id IS NULL) 
AND code IN ('B_NISSAN', 'B_TOYOTA', 'B_FORD', 'B_CHEVROLET', 'B_VW', 'B_HONDA', 'B_HYUNDAI');

-- All brands previously hardcoded to 2, now linked to real Maquinaria ID
UPDATE common_catalogs 
SET parent_id = @at_maq_id 
WHERE category = 'BRAND' 
AND (parent_id = 2 OR parent_id IS NULL) 
AND code IN ('B_CAT', 'B_KOM', 'B_JOHNDEERE', 'B_CASE', 'B_BOBCAT');

-- 3. REPAIR MODELS (Ensure they point to their real Brand parents)
-- This is more dynamic: we match models to brands based on known prefix or manually
-- But first, let's fix the most common ones from migration 018

UPDATE common_catalogs m
JOIN common_catalogs b ON b.category = 'BRAND' AND b.code = 'B_NISSAN'
SET m.parent_id = b.id
WHERE m.category = 'MODEL' AND m.code IN ('M_TSURU', 'M_NP300', 'M_SENTRA', 'M_MARCH', 'M_VERSA');

UPDATE common_catalogs m
JOIN common_catalogs b ON b.category = 'BRAND' AND b.code = 'B_TOYOTA'
SET m.parent_id = b.id
WHERE m.category = 'MODEL' AND m.code IN ('M_HILUX', 'M_TACOMA', 'M_HIACE', 'M_COROLLA');

UPDATE common_catalogs m
JOIN common_catalogs b ON b.category = 'BRAND' AND b.code = 'B_FORD'
SET m.parent_id = b.id
WHERE m.category = 'MODEL' AND m.code IN ('M_F150', 'M_RANGER', 'M_TRANSIT', 'M_LOBO');

-- 4. ENSURE INTEGRITY FOR NEW ASSET_TYPE 'Herramienta'
UPDATE common_catalogs 
SET parent_id = @at_her_id 
WHERE category = 'BRAND' 
AND (parent_id = 3 OR parent_id IS NULL) 
AND code IN ('B_MILWAUKEE', 'B_DEWALT', 'B_MAKITA', 'B_BOSCH');

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- RECONCILIATION COMPLETE: Hierarchy Restored v.18.9.5
-- =============================================================================
