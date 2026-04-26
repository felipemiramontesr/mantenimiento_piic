-- 🔱 Archon Alpha v.39.1.3 - "Sovereign Industrial Expansion: APEX PHASE 2"
-- Logic: Injecting the Backbone of Mining Maintenance (Welding, Power, Lifting, Fluid Management).
-- Architecture: Strategic Tier Integration (Asset -> Brand -> Model).

-- ── 1. INYECCIÓN DE MARCAS LÍDERES (Sovereign Brands) ─────────────────────

INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 2, 'B_MILLER',     'Miller Electric'),
('BRAND', 2, 'B_LINCOLN',    'Lincoln Electric'),
('BRAND', 2, 'B_IR',         'Ingersoll Rand'),
('BRAND', 2, 'B_SULLAIR',    'Sullair'),
('BRAND', 2, 'B_MANITOU',    'Manitou'),
('BRAND', 2, 'B_JLG',        'JLG'),
('BRAND', 2, 'B_GENIE',      'Genie'),
('BRAND', 2, 'B_GODWIN',     'Godwin (Xylem)'),
('BRAND', 2, 'B_WILDEN',     'Wilden'),
('BRAND', 3, 'B_RIDGID',     'Ridgid'),
('BRAND', 3, 'B_FLUKE',      'Fluke');

-- ── 2. INYECCIÓN DE MODELOS APEX (High-Performance Industrial Models) ──────

-- MILLER ELECTRIC (Soldadura Pesada)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MILLER' LIMIT 1);
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'MIL_BB400',  'Big Blue 400 Pro (Diesel)'),
('MODEL', @brand_id, 'MIL_TB325',  'Trailblazer 325'),
('MODEL', @brand_id, 'MIL_MM252',  'Millermatic 252 (MIG)');

-- LINCOLN ELECTRIC (Soldadura e Inversores)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_LINCOLN' LIMIT 1);
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'LIN_V400',   'Vantage 400 (Diesel)'),
('MODEL', @brand_id, 'LIN_R250',   'Ranger 250 GXT');

-- INGERSOLL RAND (Aire e Impacto)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_IR' LIMIT 1);
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'IR_P185',    'Compresor Portátil P185WD'),
('MODEL', @brand_id, 'IR_2850MAX', 'Impacto 1" 2850MAX-6'),
('MODEL', @brand_id, 'IR_2145QI',  'Impacto 3/4" 2145Qi');

-- SULLAIR (Compresores Industriales)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_SULLAIR' LIMIT 1);
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'SUL_185',    'Compresor 185 T4F'),
('MODEL', @brand_id, 'SUL_375',    'Compresor 375 High Pressure');

-- MANITOU (Telehandlers)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MANITOU' LIMIT 1);
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'MAN_MT1840', 'Telehandler MT 1840'),
('MODEL', @brand_id, 'MAN_MRT2550', 'Giratorio MRT 2550');

-- JLG / GENIE (Elevación)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_JLG' LIMIT 1);
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'JLG_860SJ',  'Plataforma Telescópica 860SJ'),
('MODEL', @brand_id, 'JLG_1930ES', 'Elevador de Tijera 1930ES');

SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_GENIE' LIMIT 1);
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'GEN_Z45',    'Brazo Articulado Z-45/25'),
('MODEL', @brand_id, 'GEN_S65',    'Brazo Telescópico S-65');

-- GODWIN (Bombeo de Tajo)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_GODWIN' LIMIT 1);
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'GOD_HL250M', 'Bomba de Alta Presión HL250M'),
('MODEL', @brand_id, 'GOD_CD150M', 'Bomba Autocebante CD150M');

-- WILDEN (Bombeo de Lodos)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_WILDEN' LIMIT 1);
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'WIL_P8',     'Bomba de Diafragma Pro-Flo P8');

-- RIDGID (Herramienta de Tubería/Planta)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_RIDGID' LIMIT 1);
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'RID_300',    'Roscadora de Tubería 300'),
('MODEL', @brand_id, 'RID_WRENCH', 'Llave de Grifa 24" - 48"');
