-- =============================================================================
-- Migration: 018 - Universal Industrial Master Catalog (v.31.0.2 - TOTAL FORCE SYNC)
-- Architecture: Archon Sovereign Data Infrastructure
-- Scope: TOTAL Mexican Market (2000-2026) -> Vehicles, Heavy Machinery & Tools
-- =============================================================================

-- ── 1. HELPERS: CAPTURE IDs ──────────────────────────────────────────────────
INSERT IGNORE INTO common_catalogs (category, code, label) VALUES 
('ASSET_TYPE', 'AT_VEH', 'Vehículo'),
('ASSET_TYPE', 'AT_MAQ', 'Maquinaria'),
('ASSET_TYPE', 'AT_HER', 'Herramienta');

SET @at_veh = (SELECT id FROM common_catalogs WHERE code = 'AT_VEH');
SET @at_maq = (SELECT id FROM common_catalogs WHERE code = 'AT_MAQ');
SET @at_her = (SELECT id FROM common_catalogs WHERE code = 'AT_HER');

-- ── 2. GEOGRAPHIC & OPERATIONAL NODES ───────────────────────────────────────
INSERT INTO common_catalogs (category, code, label) VALUES 
('LOCATION', 'LOC_ASZ', 'Arian Silver Zacatecas')
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO common_catalogs (category, code, label) VALUES 
('USE_TYPE', 'USE_SUP',    'Supervisión (Staff)'),
('USE_TYPE', 'USE_TRA_P',  'Transporte de Personal'),
('USE_TYPE', 'USE_CAR_L',  'Carga Ligera (Utilitario)'),
('USE_TYPE', 'USE_CAR_P',  'Carga Pesada (Logística)'),
('USE_TYPE', 'USE_OP_EXT', 'Operación Extrema (Campo)'),
('USE_TYPE', 'USE_MINA',   'Operación Mina (Socavón)')
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- ── 3. AMERICAN IRON & GLOBAL BRANDS (VEHICLES) ──────────────────────────────
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', @at_veh, 'B_NISSAN', 'Nissan'), 
('BRAND', @at_veh, 'B_TOYOTA', 'Toyota'),
('BRAND', @at_veh, 'B_CHEVROLET', 'Chevrolet'), 
('BRAND', @at_veh, 'B_FORD', 'Ford'),
('BRAND', @at_veh, 'B_VW', 'Volkswagen'), 
('BRAND', @at_veh, 'B_RAM', 'RAM / Dodge'),
('BRAND', @at_veh, 'B_GMC', 'GMC'), 
('BRAND', @at_veh, 'B_JEEP', 'Jeep'),
('BRAND', @at_veh, 'B_CADILLAC', 'Cadillac'), 
('BRAND', @at_veh, 'B_BUICK', 'Buick'),
('BRAND', @at_veh, 'B_KIA', 'KIA'), 
('BRAND', @at_veh, 'B_HYUNDAI', 'Hyundai'),
('BRAND', @at_veh, 'B_MAZDA', 'Mazda'), 
('BRAND', @at_veh, 'B_HONDA', 'Honda'),
('BRAND', @at_veh, 'B_MITSUBISHI', 'Mitsubishi'),
('BRAND', @at_veh, 'B_SUZUKI', 'Suzuki'),
('BRAND', @at_veh, 'B_MG', 'MG'),
('BRAND', @at_veh, 'B_JAC', 'JAC'),
('BRAND', @at_veh, 'B_BYD', 'BYD'),
('BRAND', @at_veh, 'B_CHANGAN', 'Changan'),
('BRAND', @at_veh, 'B_CHIREY', 'Chirey'),
('BRAND', @at_veh, 'B_OMODA', 'Omoda'),
('BRAND', @at_veh, 'B_GWM', 'GWM (Haval)'),
('BRAND', @at_veh, 'B_KW', 'Kenworth'), 
('BRAND', @at_veh, 'B_FRTL', 'Freightliner'), 
('BRAND', @at_veh, 'B_INTL', 'International'), 
('BRAND', @at_veh, 'B_PETERBILT', 'Peterbilt'),
('BRAND', @at_veh, 'B_MACK', 'Mack'), 
('BRAND', @at_veh, 'B_SCANIA', 'Scania'), 
('BRAND', @at_veh, 'B_FOTON', 'Foton')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), label = VALUES(label);

-- ── 4. INDUSTRIAL MACHINERY ─────────────────────────────────────────────────
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', @at_maq, 'B_CAT', 'Caterpillar'), 
('BRAND', @at_maq, 'B_JD', 'John Deere'),
('BRAND', @at_maq, 'B_BOBCAT', 'Bobcat'), 
('BRAND', @at_maq, 'B_JCB', 'JCB'),
('BRAND', @at_maq, 'B_VOLVO_CE', 'Volvo CE'), 
('BRAND', @at_maq, 'B_KOMATSU', 'Komatsu')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), label = VALUES(label);

-- ── 5. PROFESSIONAL TOOLS ───────────────────────────────────────────────────
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', @at_her, 'B_MILWAUKEE', 'Milwaukee'), 
('BRAND', @at_her, 'B_DEWALT', 'DeWalt'),
('BRAND', @at_her, 'B_HILTI', 'Hilti'), 
('BRAND', @at_her, 'B_MAKITA', 'Makita'),
('BRAND', @at_her, 'B_BOSCH', 'Bosch')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), label = VALUES(label);

-- ── 6. MODELS SYNC (SAMPLES) ──────────────────────────────────────────────────
-- GMC
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_GMC');
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'GMC1', 'Sierra 1500 Denali'), 
('MODEL', @brand_id, 'GMC2', 'Sierra 2500 HD'),
('MODEL', @brand_id, 'GMC3', 'Yukon Denali')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), label = VALUES(label);

-- Ford
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_FORD');
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'F1', 'F-150'), 
('MODEL', @brand_id, 'F2', 'F-350 Super Duty')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), label = VALUES(label);

-- Chevrolet
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CHEVROLET');
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'C1', 'Chevy'), 
('MODEL', @brand_id, 'C5', 'Silverado / Cheyenne')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), label = VALUES(label);

-- Caterpillar
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CAT');
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'CAT1', '320 Excavator'), 
('MODEL', @brand_id, 'CAT2', '420 Backhoe Loader')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), label = VALUES(label);
