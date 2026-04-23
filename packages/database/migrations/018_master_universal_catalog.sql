-- =============================================================================
-- Migration: 018 - Universal Industrial Master Catalog (v.31.0.0 - TOTAL PARITY)
-- Architecture: Archon Sovereign Data Infrastructure
-- Scope: TOTAL Mexican Market (2000-2026) -> Vehicles, Heavy Machinery & Tools
-- =============================================================================

-- ── 1. HELPERS: STABILIZE ROOT ASSET TYPE IDs ───────────────────────────────
-- We DELETE and RE-INSERT to force FIXED IDs (Predictability)
DELETE FROM common_catalogs WHERE code IN ('AT_VEH', 'AT_MAQ', 'AT_HER');
INSERT INTO common_catalogs (id, category, code, label) VALUES 
(1, 'ASSET_TYPE', 'AT_VEH', 'Vehículo'),
(2, 'ASSET_TYPE', 'AT_MAQ', 'Maquinaria'),
(3, 'ASSET_TYPE', 'AT_HER', 'Herramienta');

SET @at_veh = 1;
SET @at_maq = 2;
SET @at_her = 3;

-- ── 2. GEOGRAPHIC & OPERATIONAL NODES ───────────────────────────────────────
INSERT IGNORE INTO common_catalogs (category, code, label) VALUES 
('LOCATION', 'LOC_ASZ', 'Arian Silver Zacatecas');

INSERT IGNORE INTO common_catalogs (category, code, label) VALUES 
('USE_TYPE', 'USE_SUP',    'Supervisión (Staff)'),
('USE_TYPE', 'USE_TRA_P',  'Transporte de Personal'),
('USE_TYPE', 'USE_CAR_L',  'Carga Ligera (Utilitario)'),
('USE_TYPE', 'USE_CAR_P',  'Carga Pesada (Logística)'),
('USE_TYPE', 'USE_OP_EXT', 'Operación Extrema (Campo)'),
('USE_TYPE', 'USE_MINA',   'Operación Mina (Socavón)');

-- ── 3. AMERICAN IRON EXPANSION (VEHICLES) ───────────────────────────────────
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', @at_veh, 'B_NISSAN', 'Nissan'), ('BRAND', @at_veh, 'B_TOYOTA', 'Toyota'),
('BRAND', @at_veh, 'B_CHEVROLET', 'Chevrolet'), ('BRAND', @at_veh, 'B_FORD', 'Ford'),
('BRAND', @at_veh, 'B_VW', 'Volkswagen'), ('BRAND', @at_veh, 'B_RAM', 'RAM / Dodge'),
('BRAND', @at_veh, 'B_GMC', 'GMC'), ('BRAND', @at_veh, 'B_JEEP', 'Jeep'),
('BRAND', @at_veh, 'B_CADILLAC', 'Cadillac'), ('BRAND', @at_veh, 'B_BUICK', 'Buick'),
('BRAND', @at_veh, 'B_KIA', 'KIA'), ('BRAND', @at_veh, 'B_HYUNDAI', 'Hyundai'),
('BRAND', @at_veh, 'B_MAZDA', 'Mazda'), ('BRAND', @at_veh, 'B_HONDA', 'Honda'),
('BRAND', @at_veh, 'B_KW', 'Kenworth'), ('BRAND', @at_veh, 'B_FRTL', 'Freightliner'),
('BRAND', @at_veh, 'B_INTL', 'International'), ('BRAND', @at_veh, 'B_PETERBILT', 'Peterbilt'),
('BRAND', @at_veh, 'B_MACK', 'Mack'), ('BRAND', @at_veh, 'B_SCANIA', 'Scania'), ('BRAND', @at_veh, 'B_FOTON', 'Foton');

-- ── 4. INDUSTRIAL MACHINERY EXPANSION ───────────────────────────────────────
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', @at_maq, 'B_CAT', 'Caterpillar'), ('BRAND', @at_maq, 'B_JD', 'John Deere'),
('BRAND', @at_maq, 'B_BOBCAT', 'Bobcat'), ('BRAND', @at_maq, 'B_JCB', 'JCB'),
('BRAND', @at_maq, 'B_VOLVO_CE', 'Volvo CE'), ('BRAND', @at_maq, 'B_KOMATSU', 'Komatsu');

-- ── 5. PROFESSIONAL TOOLS EXPANSION ─────────────────────────────────────────
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', @at_her, 'B_MILWAUKEE', 'Milwaukee'), ('BRAND', @at_her, 'B_DEWALT', 'DeWalt'),
('BRAND', @at_her, 'B_HILTI', 'Hilti'), ('BRAND', @at_her, 'B_MAKITA', 'Makita'),
('BRAND', @at_her, 'B_BOSCH', 'Bosch');

-- ── 6. MODELS: GMC ────────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_GMC');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'GMC1', 'Sierra 1500 Denali'), ('MODEL', @brand_id, 'GMC2', 'Sierra 2500 HD'),
('MODEL', @brand_id, 'GMC3', 'Yukon Denali'), ('MODEL', @brand_id, 'GMC4', 'Acadia'), ('MODEL', @brand_id, 'GMC5', 'Canyon');

-- ── 7. MODELS: JEEP ───────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_JEEP');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'JP1', 'Wrangler Rubicon'), ('MODEL', @brand_id, 'JP2', 'Gladiator'),
('MODEL', @brand_id, 'JP3', 'Grand Cherokee'), ('MODEL', @brand_id, 'JP4', 'Liberty (Legacy)'), ('MODEL', @brand_id, 'JP5', 'Compass');

-- ── 8. MODELS: CATERPILLAR ────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CAT');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'CAT1', '320 Excavator'), ('MODEL', @brand_id, 'CAT2', '420 Backhoe Loader'),
('MODEL', @brand_id, 'CAT3', 'D6 Dozzer'), ('MODEL', @brand_id, 'CAT4', '950 Wheel Loader');

-- ── 9. MODELS: PETERBILT / MACK ───────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_PETERBILT');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'PB1', '389 Classic'), ('MODEL', @brand_id, 'PB2', '579 Aero');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MACK');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'MK1', 'Anthem'), ('MODEL', @brand_id, 'MK2', 'Granite (Mina)');

-- ── 10. MODELS: MILWAUKEE ─────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MILWAUKEE');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'MW1', 'M18 Fuel Drill'), ('MODEL', @brand_id, 'MW2', 'M18 Impact Wrench'), ('MODEL', @brand_id, 'MW3', 'M18 Saw');

-- =============================================================================
-- MIGRATION COMPLETE: UNIVERSAL INDUSTRIAL MASTER CATALOG v.31.0.0
-- =============================================================================
