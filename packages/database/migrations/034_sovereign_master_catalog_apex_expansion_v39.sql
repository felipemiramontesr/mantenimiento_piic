-- 🔱 Archon Alpha v.39.0.5 - "Sovereign Master Catalog Apex Expansion"
-- Logic: Zero-Gaps Industrial Hierarchy for World-Class Mining Operations.
-- Architecture: Triple-Tier Sovereign Integration (Asset -> Brand -> Model).

-- ── 1. EXPANSIÓN DE MARCAS SOBERANAS (CAPA MINERA & PESADA) ───────────────

-- MAQUINARIA (Category ID: 2)
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 2, 'B_SANDVIK',   'Sandvik (Mining)'),
('BRAND', 2, 'B_EPIROC',    'Epiroc (Atlas Copco Mining)'),
('BRAND', 2, 'B_LIEBHERR',  'Liebherr'),
('BRAND', 2, 'B_HITACHI',   'Hitachi Construction'),
('BRAND', 2, 'B_METSO',     'Metso Outotec'),
('BRAND', 2, 'B_PUTZMEISTER','Putzmeister (Concreto)'),
('BRAND', 2, 'B_TEREX',     'Terex / Genie'),
('BRAND', 2, 'B_CASE',      'Case Construction'),
('BRAND', 2, 'B_HYUNDAI_CE','Hyundai Construction');

-- HERRAMIENTA ESPECIALIZADA (Category ID: 3)
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 3, 'B_ENERPAC',   'Enerpac (Hidráulica Alta Presión)'),
('BRAND', 3, 'B_HYTORC',    'Hytorc (Torque Hidráulico)'),
('BRAND', 3, 'B_MSA',       'MSA Safety'),
('BRAND', 3, 'B_DRAEGER',   'Draeger (Seguridad/Rescate)'),
('BRAND', 3, 'B_TRIMBLE',   'Trimble (Geosistemas)'),
('BRAND', 3, 'B_PROTO',     'Proto (Herramienta Mecánica)'),
('BRAND', 3, 'B_WRIGHT',    'Wright Tool');

-- ── 2. JERARQUÍA APEX: VEHÍCULOS (Category ID: 1) ──────────────────────────

-- KENWORTH (Brand ID: 45)
SET @brand_id = 45;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_KW_T680_SL', 'T680 Sleeper Cab (Larga Distancia)'),
('MODEL', @brand_id, 'M_KW_T680_DC', 'T680 Day Cab (Logística Local)'),
('MODEL', @brand_id, 'M_KW_T880_MX', 'T880 Mezclador / Volteo (Heavy Duty)'),
('MODEL', @brand_id, 'M_KW_W900_L',  'W900L Classic Long Hood'),
('MODEL', @brand_id, 'M_KW_T370_T',  'T370 Torton (Reparto Pesado)');

-- INTERNATIONAL (Brand ID: 47)
SET @brand_id = 47;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_INT_LT_SL',  'LT Series Sleeper Cab'),
('MODEL', @brand_id, 'M_INT_HV_OFF', 'HV Series Off-Road (Mina)'),
('MODEL', @brand_id, 'M_INT_MV_REF', 'MV Series Refrigerado / Caja');

-- TOYOTA MINING SPEC (Brand ID: 253)
SET @brand_id = 253;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_TOY_HIL_SR5', 'Hilux SR5 4x4 (Mina Spec)'),
('MODEL', @brand_id, 'M_TOY_LC_70',   'Land Cruiser Serie 70 (Socavón)');

-- ── 3. JERARQUÍA APEX: MAQUINARIA PESADA (Category ID: 2) ──────────────────

-- SANDVIK (Brand ID - NEW)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_SANDVIK');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'SAN_DD421',  'Jumbo de Perforación DD421'),
('MODEL', @brand_id, 'SAN_LH517',  'LHD Scooptram LH517 (17 Ton)'),
('MODEL', @brand_id, 'SAN_TH663',  'Camión de Bajo Perfil TH663 (63 Ton)');

-- EPIROC (Brand ID - NEW)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_EPIROC');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'EPI_S7',     'Boomer S7 (Jumbo Frontal)'),
('MODEL', @brand_id, 'EPI_MT65',   'Minetruck MT65 (Dúmper de Mina)'),
('MODEL', @brand_id, 'EPI_ST14',   'Scooptram ST14 (LHD)');

-- CATERPILLAR MINING (Brand ID: 28)
SET @brand_id = 28;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'CAT_777',    'Camión Fuera de Carretera 777G'),
('MODEL', @brand_id, 'CAT_992',    'Cargador de Ruedas 992 (Mina)'),
('MODEL', @brand_id, 'CAT_D11_CD', 'Tractor D11 Carrydozer'),
('MODEL', @brand_id, 'CAT_395_ME', 'Excavadora Masiva 395');

-- LIEBHERR (Brand ID - NEW)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_LIEBHERR');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'LIE_R9800',  'Excavadora Minera R 9800'),
('MODEL', @brand_id, 'LIE_T284',   'Camión Minero T 284 (360 Ton)');

-- ── 4. JERARQUÍA APEX: HERRAMIENTA & SEGURIDAD (Category ID: 3) ────────────

-- ENERPAC (Brand ID - NEW)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_ENERPAC');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'ENE_RC',     'Cilindro Hidráulico Serie RC'),
('MODEL', @brand_id, 'ENE_P80',    'Bomba Manual Hidráulica P80'),
('MODEL', @brand_id, 'ENE_SQU',    'Llave de Torque Hidráulica S'),
('MODEL', @brand_id, 'ENE_CUT',    'Cortador de Tuercas Hidráulico');

-- HYTORC (Brand ID - NEW)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_HYTORC');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'HYT_ICE',    'Llave de Torque Hidráulica ICE'),
('MODEL', @brand_id, 'HYT_STE',    'Stealth (Llave de Bajo Perfil)'),
('MODEL', @brand_id, 'HYT_VECT',   'Bomba Eléctrica Vector');

-- MSA SAFETY (Brand ID - NEW)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MSA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'MSA_ALTAIR', 'Detector de Gases Altair 4XR'),
('MODEL', @brand_id, 'MSA_V_GARD', 'Casco V-Gard Mining Spec'),
('MODEL', @brand_id, 'MSA_W_65',   'Auto-rescatador W-65');

-- TRIMBLE (Brand ID - NEW)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_TRIMBLE');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'TRI_R12',    'Receptor GNSS R12i'),
('MODEL', @brand_id, 'TRI_S7',     'Estación Total Robótica S7'),
('MODEL', @brand_id, 'TRI_SX12',   'Scanner de Escaneo SX12');

-- PROTO TOOLS (Brand ID - NEW)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_PROTO');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'PRO_BOX',    'Juego de Llaves Maestras Proto-700'),
('MODEL', @brand_id, 'PRO_TORQ',   'Torquímetro Dial de Alta Precisión');
