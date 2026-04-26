-- 🔱 Archon Alpha v.39.0.7 - "Sovereign Industrial Master Catalog: ZENITH CONSOLIDATED"
-- Logic: The Ultimate Asset Intelligence Engine for World-Class Mining Operations.
-- Architecture: Triple-Tier Sovereign Integration (Asset -> Brand -> Model).
-- Purpose: Complete restoration of hierarchy and massive expansion (Vehicles, Machinery, Fixed Plant, Lab).

-- ── 1. REPARACIÓN DE JERARQUÍA SOBERANA (Orphan Repair) ───────────────────

-- NISSAN (Brand ID: 23)
UPDATE common_catalogs SET parent_id = 23 WHERE category = 'MODEL' AND (code LIKE 'M_NIS_%' OR code LIKE 'M_URVAN_%' OR code LIKE 'M_NP300_%' OR code LIKE 'M_VERSA%' OR code LIKE 'M_SENTRA%' OR code LIKE 'M_KICKS%' OR code LIKE 'M_XTRAIL%' OR code LIKE 'M_PATH%' OR code LIKE 'M_MARCH%' OR label IN ('Versa', 'Sentra', 'Kicks', 'X-Trail', 'Pathfinder', 'Armada', 'Urvan Carga', 'Urvan Pasajeros', 'NP300 Chasis', 'NP300 Pick Up', 'Frontier LE', 'Frontier PRO-4X'));

-- TOYOTA (Brand ID: 253)
UPDATE common_catalogs SET parent_id = 253 WHERE category = 'MODEL' AND (code LIKE 'M_TOY_%' OR code LIKE 'M_HILUX%' OR code LIKE 'M_TACOMA%' OR code LIKE 'M_HIACE%' OR code LIKE 'M_AVANZA%' OR code LIKE 'M_RAV4%' OR code LIKE 'M_COROLLA%' OR code LIKE 'M_YARIS%' OR code LIKE 'M_RAIZE%' OR label IN ('Hilux', 'Tacoma', 'Hiace', 'Avanza', 'RAV4', 'Corolla', 'Camry', 'Sienna', 'Tundra', 'Yaris Sedán', 'Raize'));

-- FORD (Brand ID: 24)
UPDATE common_catalogs SET parent_id = 24 WHERE category = 'MODEL' AND (code LIKE 'M_FORD_%' OR code LIKE 'M_F150%' OR code LIKE 'M_F250%' OR code LIKE 'M_F350%' OR code LIKE 'M_F450%' OR code LIKE 'M_RANG_%' OR code LIKE 'M_TRANSIT%' OR label IN ('F-150 / Lobo', 'Ranger', 'Transit Carga', 'Transit Pasajeros', 'Explorer', 'Expedition', 'Maverick'));

-- CHEVROLET (Brand ID: 32)
UPDATE common_catalogs SET parent_id = 32 WHERE category = 'MODEL' AND (code LIKE 'M_CHV_%' OR code LIKE 'M_S10_%' OR code LIKE 'M_SILVERADO%' OR code LIKE 'M_COLORADO%' OR code LIKE 'M_AVEO%' OR code LIKE 'M_CAPTIVA%' OR code LIKE 'M_GROOVE%' OR code LIKE 'M_TAHOE%' OR code LIKE 'M_SUBURBAN%' OR label IN ('Silverado / Cheyenne', 'S10 Max', 'Colorado', 'Aveo', 'Captiva', 'Tahoe', 'Suburban', 'Tornado Van', 'Groove'));

-- RAM (Brand ID: 33)
UPDATE common_catalogs SET parent_id = 33 WHERE category = 'MODEL' AND (code LIKE 'M_RAM_%' OR code LIKE 'M_PRO_2500' OR code LIKE 'M_PRO_RAPID' OR label IN ('Ram 700', 'Ram 1500', 'Ram 2500 HD', 'Ram 4000 Chasis', 'Promaster Rapid'));

-- VOLKSWAGEN (Brand ID: 34)
UPDATE common_catalogs SET parent_id = 34 WHERE category = 'MODEL' AND (code LIKE 'M_VW_%' OR code LIKE 'M_AMAROK%' OR code LIKE 'M_SAVEIRO%' OR code LIKE 'M_CRA%' OR code LIKE 'M_TRANS_T6' OR label IN ('Amarok', 'Saveiro', 'Crafter', 'Transporter T6', 'Jetta', 'Tiguan', 'Taos'));

-- KENWORTH (Brand ID: 45)
UPDATE common_catalogs SET parent_id = 45 WHERE category = 'MODEL' AND (code LIKE 'M_KW_%' OR code LIKE 'W3' OR code LIKE 'W4' OR code LIKE 'W5' OR code LIKE 'W6' OR label IN ('T680', 'T880', 'T370', 'W900'));

-- FREIGHTLINER (Brand ID: 46)
UPDATE common_catalogs SET parent_id = 46 WHERE category = 'MODEL' AND (code LIKE 'M_FR_%' OR code LIKE 'L1' OR code LIKE 'L2' OR code LIKE 'L3' OR label IN ('Cascadia', 'M2 Business Class', 'FL360 (Chato)'));

-- CATERPILLAR (Brand ID: 28)
UPDATE common_catalogs SET parent_id = 28 WHERE category = 'MODEL' AND (code LIKE 'M_CAT_%' OR code LIKE 'CAT%' OR label LIKE 'Excavadora%' OR label LIKE 'Retroexcavadora%' OR label LIKE 'Tractor D%' OR label LIKE 'Cargador Frontal%');

-- MILWAUKEE / HILTI / MAKITA / BOSCH (Specialized Fix)
UPDATE common_catalogs SET parent_id = 440 WHERE category = 'MODEL' AND (code LIKE 'M_M18_%' OR code LIKE 'M_M12_%' OR code LIKE 'MW%');
UPDATE common_catalogs SET parent_id = 442 WHERE category = 'MODEL' AND (code LIKE 'M_TE_%' OR code LIKE 'M_DD_%' OR code LIKE 'M_PS_%' OR code LIKE 'HIL%');
UPDATE common_catalogs SET parent_id = 443 WHERE category = 'MODEL' AND (code LIKE 'MAK_%' OR label LIKE 'Makita%');
UPDATE common_catalogs SET parent_id = 444 WHERE category = 'MODEL' AND (code LIKE 'BOS_%' OR label LIKE 'Bosch%');

-- ── 2. EXPANSIÓN ZENITH: MARCAS INDUSTRIALES & MINERAS ────────────────────

INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 2, 'B_SANDVIK',    'Sandvik (Mining)'),
('BRAND', 2, 'B_EPIROC',     'Epiroc'),
('BRAND', 2, 'B_FLSMIDTH',   'FLSmidth (Planta)'),
('BRAND', 2, 'B_WARMAN',     'Warman (Bombas Slurry)'),
('BRAND', 2, 'B_NORMET',     'Normet (Socavón)'),
('BRAND', 2, 'B_GETMAN',     'Getman (Logística UG)'),
('BRAND', 2, 'B_WACKER',     'Wacker Neuson'),
('BRAND', 2, 'B_ATLAS_C',    'Atlas Copco'),
('BRAND', 2, 'B_LIEBHERR',   'Liebherr'),
('BRAND', 2, 'B_HITACHI',    'Hitachi Construction'),
('BRAND', 3, 'B_THERMO',     'Thermo Scientific (Lab)'),
('BRAND', 3, 'B_ENERPAC',    'Enerpac (Hidráulica)'),
('BRAND', 3, 'B_HYTORC',     'Hytorc (Torque)'),
('BRAND', 3, 'B_MSA',        'MSA Safety'),
('BRAND', 3, 'B_DRAEGER',    'Draeger'),
('BRAND', 3, 'B_LEICA',      'Leica Geosystems'),
('BRAND', 3, 'B_TRIMBLE',    'Trimble'),
('BRAND', 3, 'B_RIDGID',     'Ridgid'),
('BRAND', 3, 'B_FLUKE',      'Fluke');

-- ── 3. JERARQUÍA ZENITH: MODELOS DE ALTO IMPACTO ──────────────────────────

-- MAZDA / SUZUKI / BYD
SET @brand_id = 38;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'M_MAZ_CX5', 'CX-5'), ('MODEL', @brand_id, 'M_MAZ_3', 'Mazda 3');
SET @brand_id = 255;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'M_SUZ_JIM_3D', 'Jimny 3-Door');
SET @brand_id = 257;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'M_BYD_SHARK', 'Shark Pickup'), ('MODEL', @brand_id, 'M_BYD_DOLP', 'Dolphin');

-- SANDVIK / EPIROC / CAT MINING
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_SANDVIK');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'SAN_DD421', 'Jumbo DD421'), ('MODEL', @brand_id, 'SAN_LH517', 'Scooptram LH517');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_EPIROC');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'EPI_S7', 'Boomer S7'), ('MODEL', @brand_id, 'EPI_MT65', 'Minetruck MT65');
SET @brand_id = 28;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'CAT_777', 'Camión 777G'), ('MODEL', @brand_id, 'CAT_992', 'Cargador 992');

-- PLANTA & BOMBEO (FLSmidth / Warman)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_FLSMIDTH');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'FLS_SAG', 'Molino SAG'), ('MODEL', @brand_id, 'FLS_BALL', 'Molino de Bolas');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_WARMAN');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'WAR_AH', 'Bomba Warman AH'), ('MODEL', @brand_id, 'WAR_MC', 'Bomba MC');

-- LAB & PRECISIÓN (Thermo / Leica / Fluke)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_THERMO');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'THE_NITON', 'Analizador XRF Niton XL5');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_LEICA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'LEI_TS07', 'Estación Total TS07');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_FLUKE');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'M_FLU_87V', 'Multímetro 87V');

-- SOCAVÓN & ESPECIALIZADO (Normet / Hytorc / Enerpac)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_NORMET');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'NOR_SPRAY', 'Spraymec'), ('MODEL', @brand_id, 'NOR_CHARG', 'Charmec');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_HYTORC');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'HYT_STE', 'Llave Stealth');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_ENERPAC');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'ENE_RC', 'Cilindro RC'), ('MODEL', @brand_id, 'ENE_P80', 'Bomba P80');
