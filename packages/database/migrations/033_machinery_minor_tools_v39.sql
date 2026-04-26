-- 🔱 Archon Alpha v.39.0.4 - "Machinery & Minor Tools Sovereignty"
-- Logic: Seeding specialized industrial assets for power generation, compression, and precision measurement.
-- Architecture: High-density technical catalog for the Mexican industrial sector.

-- ── 1. MAQUINARIA LIGERA & GENERACIÓN ─────────────────────────────────────

-- HONDA (Brand ID: 254 - shared for machinery/tools)
-- We ensure Honda is also listed under Category 2 and 3 if needed, 
-- but since parent_id in JSON is '1' (Vehículo), we add a machinery entry.
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 2, 'B_HONDA_MAQ', 'Honda Machinery');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_HONDA_MAQ');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'HON_EU22', 'Generador EU2200i'),
('MODEL', @brand_id, 'HON_WB20', 'Mota-bomba WB20XT'),
('MODEL', @brand_id, 'HON_GX200', 'Motor Estacionario GX200');

-- WACKER NEUSON (Brand ID - NEW)
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 2, 'B_WACKER', 'Wacker Neuson');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_WACKER');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'WAK_LTN6', 'Torre de Luz LTN 6L'),
('MODEL', @brand_id, 'WAK_RT82', 'Compactador Pata de Cabra RT 82'),
('MODEL', @brand_id, 'WAK_BS60', 'Bailarina / Apisonador BS60-2');

-- CASE CE (Brand ID - NEW)
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 2, 'B_CASE_CE', 'Case CE');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CASE_CE');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'CASE_580N', 'Retroexcavadora 580N'),
('MODEL', @brand_id, 'CASE_SR210', 'Mini Cargador SR210'),
('MODEL', @brand_id, 'CASE_CX210', 'Excavadora CX210D');

-- ── 2. COMPRESIÓN & NEUMÁTICA ──────────────────────────────────────────────

-- ATLAS COPCO (Brand ID - NEW)
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 2, 'B_ATLAS_C', 'Atlas Copco');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_ATLAS_C');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'ATL_XAS185', 'Compresor Portátil XAS 185'),
('MODEL', @brand_id, 'ATL_TEX20',  'Rompedor Neumático TEX 20');

-- ── 3. HERRAMIENTA ESPECIALIZADA & MEDICIÓN ─────────────────────────────────

-- RIDGID (Brand ID - NEW)
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 3, 'B_RIDGID', 'Ridgid');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_RIDGID');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'RID_300', 'Roscadora Eléctrica 300'),
('MODEL', @brand_id, 'RID_K45', 'Destapacaños K-45AF'),
('MODEL', @brand_id, 'RID_SS',  'Cámara Inspección SeeSnake');

-- LEICA GEOSYSTEMS (Brand ID - NEW)
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 3, 'B_LEICA', 'Leica Geosystems');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_LEICA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'LEI_TS07', 'Estación Total FlexLine TS07'),
('MODEL', @brand_id, 'LEI_NA32', 'Nivel Automático NA324'),
('MODEL', @brand_id, 'LEI_BLK',  'Scanner Láser BLK360');

-- GREENLEE (Brand ID - NEW)
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 3, 'B_GREENLEE', 'Greenlee');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_GREENLEE');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'GRN_881', 'Dobladora Hidráulica 881CT'),
('MODEL', @brand_id, 'GRN_767', 'Sacabocados Hidráulico 767'),
('MODEL', @brand_id, 'GRN_EK12', 'Prensadora Hidráulica EK1240L');

-- ── 4. LIMPIEZA DE DUPLICADOS EN MODELOS DE HERRAMIENTA ────────────────────
-- En el JSON id 196-199 son Milwaukee, vamos a asegurar que tengan parent_id 440
UPDATE common_catalogs SET parent_id = 440 WHERE category = 'MODEL' AND (code LIKE 'M_M18_%' OR code LIKE 'M_M12_%' OR code LIKE 'MW%');
-- En el JSON id 201-205 son Hilti, vamos a asegurar que tengan parent_id 442
UPDATE common_catalogs SET parent_id = 442 WHERE category = 'MODEL' AND (code LIKE 'M_TE_%' OR code LIKE 'M_DD_%' OR code LIKE 'M_PS_%' OR code LIKE 'HIL%');
