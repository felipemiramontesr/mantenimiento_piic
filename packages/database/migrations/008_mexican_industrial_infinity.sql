-- =============================================================================
-- Migration: 008 - Mexican Industrial Infinity Catalog (Final Edition)
-- Architecture: Archon Collective v.18.2.0
-- Goal: Absolute metadata density for the Mexican Industrial & Logistic Market.
-- =============================================================================

-- ── 1. HELPERS: ROOT ASSET TYPE IDs ──────────────────────────────────────────
SET @at_veh = (SELECT id FROM common_catalogs WHERE code = 'AT_VEH');
SET @at_maq = (SELECT id FROM common_catalogs WHERE code = 'AT_MAQ');
SET @at_her = (SELECT id FROM common_catalogs WHERE code = 'AT_HER');

-- ── 2. VEHICLE BRANDS (AT_VEH) ───────────────────────────────────────────────
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', @at_veh, 'B_NISSAN',     'Nissan'),
('BRAND', @at_veh, 'B_TOYOTA',     'Toyota'),
('BRAND', @at_veh, 'B_FORD',       'Ford'),
('BRAND', @at_veh, 'B_CHEVROLET',  'Chevrolet'),
('BRAND', @at_veh, 'B_VW',         'Volkswagen'),
('BRAND', @at_veh, 'B_RAM',        'RAM'),
('BRAND', @at_veh, 'B_MITSUBISHI', 'Mitsubishi'),
('BRAND', @at_veh, 'B_HYUNDAI',    'Hyundai'),
('BRAND', @at_veh, 'B_KIA',         'KIA'),
('BRAND', @at_veh, 'B_MAZDA',       'Mazda'),
('BRAND', @at_veh, 'B_ISUZU',      'Isuzu'),
('BRAND', @at_veh, 'B_HINO',       'Hino'),
('BRAND', @at_veh, 'B_KW',         'Kenworth'),
('BRAND', @at_veh, 'B_FRTL',       'Freightliner'),
('BRAND', @at_veh, 'B_INTL',       'International'),
('BRAND', @at_veh, 'B_MACK',       'Mack'),
('BRAND', @at_veh, 'B_WESTERN',     'Western Star'),
('BRAND', @at_veh, 'B_SCANIA',      'Scania'),
('BRAND', @at_veh, 'B_VOLVOT',      'Volvo Trucks'),
('BRAND', @at_veh, 'B_MERCEDES',   'Mercedes-Benz'),
('BRAND', @at_veh, 'B_JAC',        'JAC'),
('BRAND', @at_veh, 'B_MG',         'MG'),
('BRAND', @at_veh, 'B_HONDA',      'Honda'),
('BRAND', @at_veh, 'B_FOTON',      'Foton'),
('BRAND', @at_veh, 'B_GMC',        'GMC'),
('BRAND', @at_veh, 'B_JEEP',       'Jeep');

-- ── 3. VEHICLE MODELS (MX FOCUS) ──────────────────────────────────────────────

-- NISSAN
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_NISSAN');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_NP300_CH',  'NP300 Chasis'),
('MODEL', @brand_id, 'M_NP300_EST', 'NP300 Estaquitas'),
('MODEL', @brand_id, 'M_FRONTIER',  'Frontier Pro-4X'),
('MODEL', @brand_id, 'M_URVAN_PAN', 'Urvan Panel'),
('MODEL', @brand_id, 'M_URVAN_PAS', 'Urvan Pasajeros'),
('MODEL', @brand_id, 'M_MARCH',     'March (Staff)'),
('MODEL', @brand_id, 'M_VERSA',     'Versa (Admin)'),
('MODEL', @brand_id, 'M_SENTRA',    'Sentra'),
('MODEL', @brand_id, 'M_NV3500',    'NV3500 Carga');

-- TOYOTA
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_HILUX_G',   'Hilux Gasolina'),
('MODEL', @brand_id, 'M_HILUX_D',   'Hilux Diésel'),
('MODEL', @brand_id, 'M_TACOMA',    'Tacoma V6'),
('MODEL', @brand_id, 'M_HIACE_PAN', 'Hiace Panel'),
('MODEL', @brand_id, 'M_HIACE_PAS', 'Hiace Pasajeros'),
('MODEL', @brand_id, 'M_AVANZA',    'Avanza'),
('MODEL', @brand_id, 'M_RAV4',      'RAV4'),
('MODEL', @brand_id, 'M_TUNDRA',    'Tundra');

-- FORD
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_FORD');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_F150',      'F-150 / Lobo'),
('MODEL', @brand_id, 'M_F250',      'F-250 Super Duty'),
('MODEL', @brand_id, 'M_F350',      'F-350 Chasis'),
('MODEL', @brand_id, 'M_F450',      'F-450 Pesado'),
('MODEL', @brand_id, 'M_RANGER',    'Ranger'),
('MODEL', @brand_id, 'M_TRANSIT_V', 'Transit Van'),
('MODEL', @brand_id, 'M_TRANSIT_C', 'Transit Custom'),
('MODEL', @brand_id, 'M_MAVERICK',  'Maverick');

-- CHEVROLET
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CHEVROLET');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_S10_MAX',   'S10 Max Chasis'),
('MODEL', @brand_id, 'M_SILVERADO', 'Silverado 1500'),
('MODEL', @brand_id, 'M_CHEYENNE',  'Cheyenne V8'),
('MODEL', @brand_id, 'M_COLORADO',  'Colorado'),
('MODEL', @brand_id, 'M_TORNADO',   'Tornado Van'),
('MODEL', @brand_id, 'M_AVEO',      'Aveo (Staff)'),
('MODEL', @brand_id, 'M_TAHOE',     'Tahoe (Exec)'),
('MODEL', @brand_id, 'M_SUBURBAN',  'Suburban');

-- RAM
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_RAM');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_RAM_700',   'Ram 700 SLT'),
('MODEL', @brand_id, 'M_RAM_1500',  'Ram 1500'),
('MODEL', @brand_id, 'M_RAM_2500',  'Ram 2500 HD'),
('MODEL', @brand_id, 'M_RAM_4000',  'Ram 4000 Chasis'),
('MODEL', @brand_id, 'M_PROMASTER', 'Promaster 2500'),
('MODEL', @brand_id, 'M_PRO_RAPID', 'Promaster Rapid');

-- ISUZU / HINO (MX LOGISTICS)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_ISUZU');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_ELF_100', 'ELF 100'),
('MODEL', @brand_id, 'M_ELF_200', 'ELF 200'),
('MODEL', @brand_id, 'M_ELF_300', 'ELF 300'),
('MODEL', @brand_id, 'M_ELF_400', 'ELF 400'),
('MODEL', @brand_id, 'M_ELF_500', 'ELF 500'),
('MODEL', @brand_id, 'M_ELF_600', 'ELF 600'),
('MODEL', @brand_id, 'M_FOR_800', 'Forward 800');

SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_HINO');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_H300_514', 'Serie 300 - 514'),
('MODEL', @brand_id, 'M_H300_614', 'Serie 300 - 614'),
('MODEL', @brand_id, 'M_H300_716', 'Serie 300 - 716'),
('MODEL', @brand_id, 'M_H300_816', 'Serie 300 - 816'),
('MODEL', @brand_id, 'M_H500_1018', 'Serie 500 - 1018');

-- KENWORTH / FREIGHTLINER
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_KW');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_T680', 'Kenworth T680'),
('MODEL', @brand_id, 'M_T880', 'Kenworth T880'),
('MODEL', @brand_id, 'M_T370', 'Kenworth T370'),
('MODEL', @brand_id, 'M_KW55', 'Kenworth KW55');

SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_FRTL');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_CASCADIA', 'Cascadia'),
('MODEL', @brand_id, 'M_M2_106',   'M2 106'),
('MODEL', @brand_id, 'M_M2_112',   'M2 112');

-- ── 4. MACHINERY BRANDS (AT_MAQ) ──────────────────────────────────────────────
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', @at_maq, 'B_CAT',       'Caterpillar'),
('BRAND', @at_maq, 'B_JD',        'John Deere'),
('BRAND', @at_maq, 'B_KOM',       'Komatsu'),
('BRAND', @at_maq, 'B_CASE',      'Case'),
('BRAND', @at_maq, 'B_VOLVO_CE',  'Volvo CE'),
('BRAND', @at_maq, 'B_SANY',      'Sany'),
('BRAND', @at_maq, 'B_XCMG',      'XCMG'),
('BRAND', @at_maq, 'B_BOBCAT',    'Bobcat'),
('BRAND', @at_maq, 'B_JCB',       'JCB'),
('BRAND', @at_maq, 'B_HYSTER',    'Hyster'),
('BRAND', @at_maq, 'B_YALE',      'Yale'),
('BRAND', @at_maq, 'B_TOYOTA_MH', 'Toyota MH'),
('BRAND', @at_maq, 'B_CROWN',     'Crown'),
('BRAND', @at_maq, 'B_GENIE',     'Genie'),
('BRAND', @at_maq, 'B_JLG',       'JLG');

-- ── 5. MACHINERY MODELS ──────────────────────────────────────────────────────

-- CATERPILLAR
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CAT');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_CAT_320',  'Excavadora 320'),
('MODEL', @brand_id, 'M_CAT_336',  'Excavadora 336'),
('MODEL', @brand_id, 'M_CAT_416',  'Retroexcavadora 416'),
('MODEL', @brand_id, 'M_CAT_420',  'Retroexcavadora 420'),
('MODEL', @brand_id, 'M_CAT_D6',   'Tractor D6'),
('MODEL', @brand_id, 'M_CAT_D8',   'Tractor D8'),
('MODEL', @brand_id, 'M_CAT_120',  'Motoniveladora 120'),
('MODEL', @brand_id, 'M_CAT_140',  'Motoniveladora 140'),
('MODEL', @brand_id, 'M_CAT_950',  'Cargador 950'),
('MODEL', @brand_id, 'M_CAT_966',  'Cargador 966');

-- JOHN DEERE
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_JD');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_JD_310L', 'Retroexcavadora 310L'),
('MODEL', @brand_id, 'M_JD_210G', 'Excavadora 210G'),
('MODEL', @brand_id, 'M_JD_6115J', 'Tractor 6115J'),
('MODEL', @brand_id, 'M_JD_670G', 'Motoniveladora 670G');

-- MATERIAL HANDLING (FORKLIFTS)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_HYSTER');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_HYS_H50',  'Hyster H50FT (2.5T)'),
('MODEL', @brand_id, 'M_HYS_H155', 'Hyster H155FT (7T)');

SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA_MH');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_TOY_8FGU', 'Toyota 8FGU25'),
('MODEL', @brand_id, 'M_TOY_7FBE', 'Toyota Eléctrico 7FBE');

-- ── 6. TOOL BRANDS & MODELS (AT_HER) ──────────────────────────────────────────
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', @at_her, 'B_MILWAUKEE', 'Milwaukee'),
('BRAND', @at_her, 'B_HILTI',     'Hilti'),
('BRAND', @at_her, 'B_DEWALT',    'DeWalt'),
('BRAND', @at_her, 'B_MAKITA',    'Makita'),
('BRAND', @at_her, 'B_FLUKE',     'Fluke');

SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MILWAUKEE');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_M18_IMP', 'Impacto M18 FUEL 1/2'),
('MODEL', @brand_id, 'M_M18_DRL', 'Hammer Drill M18 FUEL');

SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_HILTI');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_TE_70',   'Rotomartillo TE 70'),
('MODEL', @brand_id, 'M_PS_1000', 'Scanner Concreto PS 1000');

-- =============================================================================
-- MIGRATION COMPLETE: INFINITY DATA SEED v.18.2.0
-- =============================================================================
