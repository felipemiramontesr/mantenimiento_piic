-- 🔱 Archon Alpha v.39.0.8 - "Catalog Sanitizer & Duplicate Brand Fix"
-- Logic: Merging duplicate brands (code vs null) and restoring hierarchy for Machinery/Tools.
-- Purpose: Eliminating UI "Dead-Ends" caused by orphan brands in the Mexican industrial catalog.

-- ── 1. MAQUINARIA: SANITIZACIÓN DE DUPLICADOS ──────────────────────────────

-- Consolidar ATLAS COPCO
SET @correct_id = (SELECT id FROM common_catalogs WHERE code = 'B_ATLAS_C' LIMIT 1);
UPDATE common_catalogs SET parent_id = @correct_id WHERE category = 'MODEL' AND (label LIKE '%Compresor%' OR label LIKE '%Atlas%' OR code LIKE 'ATL_%');
DELETE FROM common_catalogs WHERE category = 'BRAND' AND label = 'Atlas Copco' AND code IS NULL;

-- Consolidar CATERPILLAR
SET @correct_id = (SELECT id FROM common_catalogs WHERE code = 'B_CAT' OR code = 'B_CATERPILLAR' LIMIT 1);
UPDATE common_catalogs SET parent_id = @correct_id WHERE category = 'MODEL' AND (label LIKE '%Excavadora%' OR label LIKE '%Retro%' OR label LIKE '%CAT%' OR code LIKE 'CAT_%');
DELETE FROM common_catalogs WHERE category = 'BRAND' AND label = 'Caterpillar' AND code IS NULL;

-- Consolidar KOMATSU
SET @correct_id = (SELECT id FROM common_catalogs WHERE code = 'B_KOMATSU' LIMIT 1);
UPDATE common_catalogs SET parent_id = @correct_id WHERE category = 'MODEL' AND (label LIKE '%Komatsu%' OR code LIKE 'M_KOM_%');
DELETE FROM common_catalogs WHERE category = 'BRAND' AND label = 'Komatsu' AND code IS NULL;

-- Consolidar CASE
SET @correct_id = (SELECT id FROM common_catalogs WHERE code = 'B_CASE_CE' LIMIT 1);
UPDATE common_catalogs SET parent_id = @correct_id WHERE category = 'MODEL' AND (label LIKE '%Case%' OR code LIKE 'CASE_%');
DELETE FROM common_catalogs WHERE category = 'BRAND' AND label = 'Case CE' AND code IS NULL;

-- ── 2. HERRAMIENTA: SANITIZACIÓN DE DUPLICADOS ─────────────────────────────

-- Consolidar BOSCH
SET @correct_id = (SELECT id FROM common_catalogs WHERE code = 'B_BOSCH' LIMIT 1);
UPDATE common_catalogs SET parent_id = @correct_id WHERE category = 'MODEL' AND (label LIKE '%Esmeriladora%' OR label LIKE '%Rotomartillo%' OR code LIKE 'BOS_%' OR code LIKE 'B_BOS_%');
DELETE FROM common_catalogs WHERE category = 'BRAND' AND label = 'Bosch' AND code IS NULL;

-- Consolidar MAKITA
SET @correct_id = (SELECT id FROM common_catalogs WHERE code = 'B_MAKITA' LIMIT 1);
UPDATE common_catalogs SET parent_id = @correct_id WHERE category = 'MODEL' AND (label LIKE '%Makita%' OR code LIKE 'MAK_%');
DELETE FROM common_catalogs WHERE category = 'BRAND' AND label = 'Makita' AND code IS NULL;

-- Consolidar MILWAUKEE
SET @correct_id = (SELECT id FROM common_catalogs WHERE code = 'B_MILWAUKEE' LIMIT 1);
UPDATE common_catalogs SET parent_id = @correct_id WHERE category = 'MODEL' AND (label LIKE '%Milwaukee%' OR code LIKE 'M_M18_%' OR code LIKE 'M_M12_%');
DELETE FROM common_catalogs WHERE category = 'BRAND' AND label = 'Milwaukee' AND code IS NULL;

-- Consolidar HILTI
SET @correct_id = (SELECT id FROM common_catalogs WHERE code = 'B_HILTI' LIMIT 1);
UPDATE common_catalogs SET parent_id = @correct_id WHERE category = 'MODEL' AND (label LIKE '%Hilti%' OR code LIKE 'M_TE_%');
DELETE FROM common_catalogs WHERE category = 'BRAND' AND label = 'Hilti' AND code IS NULL;

-- ── 3. REPARACIÓN DE VÍNCULOS APEX/ZENITH ──────────────────────────────────

UPDATE common_catalogs SET parent_id = (SELECT id FROM common_catalogs WHERE code = 'B_SANDVIK' LIMIT 1) WHERE code IN ('SAN_DD421', 'SAN_LH517');
UPDATE common_catalogs SET parent_id = (SELECT id FROM common_catalogs WHERE code = 'B_EPIROC' LIMIT 1) WHERE code IN ('EPI_S7', 'EPI_MT65');
UPDATE common_catalogs SET parent_id = (SELECT id FROM common_catalogs WHERE code = 'B_FLSMIDTH' LIMIT 1) WHERE code IN ('FLS_SAG', 'FLS_BALL');
UPDATE common_catalogs SET parent_id = (SELECT id FROM common_catalogs WHERE code = 'B_WARMAN' LIMIT 1) WHERE code IN ('WAR_AH', 'WAR_MC');
UPDATE common_catalogs SET parent_id = (SELECT id FROM common_catalogs WHERE code = 'B_THERMO' LIMIT 1) WHERE code IN ('THE_NITON', 'THE_ICP');
UPDATE common_catalogs SET parent_id = (SELECT id FROM common_catalogs WHERE code = 'B_HYTORC' LIMIT 1) WHERE code IN ('HYT_STE', 'HYT_ICE');
UPDATE common_catalogs SET parent_id = (SELECT id FROM common_catalogs WHERE code = 'B_ENERPAC' LIMIT 1) WHERE code IN ('ENE_RC', 'ENE_P80');
