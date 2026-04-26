-- 🔱 Archon Alpha v.39.0.3 - "Sovereign Catalog Massive Expansion"
-- Logic: Consolidating and expanding the entire industrial hierarchy for the Mexican market.
-- Architecture: Multi-tier Sovereign Dependency (Category -> Brand -> Model).

-- ── 1. REPARACIÓN DE JERARQUÍA EXISTENTE (Modelos con Parent NULL) ─────────

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

-- MITSUBISHI (Brand ID: 35)
UPDATE common_catalogs SET parent_id = 35 WHERE category = 'MODEL' AND (code LIKE 'M_MIT_%' OR code LIKE 'B1' OR code LIKE 'B2' OR label IN ('L200 Pick Up', 'Outlander', 'Montero Sport', 'Xpander'));

-- KENWORTH (Brand ID: 45)
UPDATE common_catalogs SET parent_id = 45 WHERE category = 'MODEL' AND (code LIKE 'M_KW_%' OR code LIKE 'W3' OR code LIKE 'W4' OR code LIKE 'W5' OR code LIKE 'W6' OR label IN ('T680', 'T880', 'T370', 'W900'));

-- FREIGHTLINER (Brand ID: 46)
UPDATE common_catalogs SET parent_id = 46 WHERE category = 'MODEL' AND (code LIKE 'M_FR_%' OR code LIKE 'L1' OR code LIKE 'L2' OR code LIKE 'L3' OR label IN ('Cascadia', 'M2 Business Class', 'FL360 (Chato)'));

-- ISUZU (Brand ID: 48)
UPDATE common_catalogs SET parent_id = 48 WHERE category = 'MODEL' AND (code LIKE 'M_ISU_%' OR code LIKE 'S6' OR code LIKE 'S7' OR code LIKE 'S8' OR label IN ('ELF 100', 'ELF 600', 'Forward 1400'));

-- HINO (Brand ID: 49)
UPDATE common_catalogs SET parent_id = 49 WHERE category = 'MODEL' AND (code LIKE 'M_HIN_%' OR code LIKE 'S9' OR code LIKE 'S10' OR label IN ('Serie 300', 'Serie 500'));

-- CATERPILLAR (Brand ID: 28)
UPDATE common_catalogs SET parent_id = 28 WHERE category = 'MODEL' AND (code LIKE 'M_CAT_%' OR code LIKE 'CAT%' OR label LIKE 'Excavadora%' OR label LIKE 'Retroexcavadora%' OR label LIKE 'Tractor D%' OR label LIKE 'Cargador Frontal%');

-- HYUNDAI (Brand ID: 36)
UPDATE common_catalogs SET parent_id = 36 WHERE category = 'MODEL' AND (code LIKE 'M_HYU_%' OR code LIKE 'H1' OR code LIKE 'H2' OR label IN ('Grand i10', 'Creta', 'Tucson', 'H100 Diésel'));

-- KIA (Brand ID: 37)
UPDATE common_catalogs SET parent_id = 37 WHERE category = 'MODEL' AND (code LIKE 'M_KIA_%' OR code LIKE 'K1' OR code LIKE 'K2' OR code LIKE 'K3' OR label IN ('Rio', 'Forte', 'Sportage', 'Sorento', 'Seltos'));

-- ── 2. EXPANSIÓN MASIVA DE MODELOS (MÉXICO FLEET STANDARDS) ────────────────

-- MAZDA (Brand ID: 38)
SET @brand_id = 38;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_MAZ_2', 'Mazda 2'),
('MODEL', @brand_id, 'M_MAZ_3', 'Mazda 3'),
('MODEL', @brand_id, 'M_MAZ_CX3', 'CX-3'),
('MODEL', @brand_id, 'M_MAZ_CX30', 'CX-30'),
('MODEL', @brand_id, 'M_MAZ_CX5', 'CX-5'),
('MODEL', @brand_id, 'M_MAZ_CX50', 'CX-50'),
('MODEL', @brand_id, 'M_MAZ_CX90', 'CX-90');

-- SUZUKI (Brand ID: 255)
SET @brand_id = 255;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_SUZ_JIM_3D', 'Jimny 3-Door'),
('MODEL', @brand_id, 'M_SUZ_JIM_5D', 'Jimny 5-Door'),
('MODEL', @brand_id, 'M_SUZ_SWIFT', 'Swift'),
('MODEL', @brand_id, 'M_SUZ_ERTIGA', 'Ertiga / Ertiga XL7'),
('MODEL', @brand_id, 'M_SUZ_FRONX', 'Fronx');

-- HONDA (Brand ID: 254)
SET @brand_id = 254;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_HON_CITY', 'City'),
('MODEL', @brand_id, 'M_HON_CIVIC', 'Civic'),
('MODEL', @brand_id, 'M_HON_HRV', 'HR-V'),
('MODEL', @brand_id, 'M_HON_CRV', 'CR-V'),
('MODEL', @brand_id, 'M_HON_BRV', 'BR-V'),
('MODEL', @brand_id, 'M_HON_PILOT', 'Pilot');

-- MG (Brand ID: 39)
SET @brand_id = 39;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_MG_3', 'MG3'),
('MODEL', @brand_id, 'M_MG_5', 'MG5'),
('MODEL', @brand_id, 'M_MG_GT', 'MG GT'),
('MODEL', @brand_id, 'M_MG_ZS', 'ZS'),
('MODEL', @brand_id, 'M_MG_HS', 'HS'),
('MODEL', @brand_id, 'M_MG_RX5', 'RX5'),
('MODEL', @brand_id, 'M_MG_RX8', 'RX8');

-- CHIREY / CHERY (Brand ID: 258)
SET @brand_id = 258;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_CHI_TIG2', 'Tiggo 2 Pro'),
('MODEL', @brand_id, 'M_CHI_TIG4', 'Tiggo 4 Pro'),
('MODEL', @brand_id, 'M_CHI_TIG7', 'Tiggo 7 Pro'),
('MODEL', @brand_id, 'M_CHI_TIG8', 'Tiggo 8 Pro'),
('MODEL', @brand_id, 'M_CHI_ARR8', 'Arrizo 8');

-- BYD (Brand ID: 257)
SET @brand_id = 257;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_BYD_DOLP', 'Dolphin / Dolphin Mini'),
('MODEL', @brand_id, 'M_BYD_SEAL', 'Seal'),
('MODEL', @brand_id, 'M_BYD_SHARK', 'Shark (PHEV Pickup)'),
('MODEL', @brand_id, 'M_BYD_SONIC', 'Song Plus (PHEV)'),
('MODEL', @brand_id, 'M_BYD_TANG',  'Tang (EV SUV)');

-- JAC (Brand ID: 256)
SET @brand_id = 256;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_JAC_FT6', 'Frison T6'),
('MODEL', @brand_id, 'M_JAC_FT8', 'Frison T8'),
('MODEL', @brand_id, 'M_JAC_FT9', 'Frison T9 (Diesel 4x4)'),
('MODEL', @brand_id, 'M_JAC_SEI2', 'Sei2'),
('MODEL', @brand_id, 'M_JAC_SEI4', 'Sei4 Pro'),
('MODEL', @brand_id, 'M_JAC_SEI7', 'Sei7 Pro'),
('MODEL', @brand_id, 'M_JAC_E10X', 'E10X (EV City Car)');

-- GWM / HAVAL (Brand ID: 260)
SET @brand_id = 260;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_GWM_JOLION', 'Haval Jolion'),
('MODEL', @brand_id, 'M_GWM_H6',     'Haval H6'),
('MODEL', @brand_id, 'M_GWM_POER',   'Poer Pickup'),
('MODEL', @brand_id, 'M_GWM_TANK300','Tank 300 (Off-road)'),
('MODEL', @brand_id, 'M_GWM_ORA03',  'Ora 03 (EV)');

-- PETERBILT (Brand ID: 417)
SET @brand_id = 417;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_PET_389', '389 Classic'),
('MODEL', @brand_id, 'M_PET_579', '579 Aero'),
('MODEL', @brand_id, 'M_PET_567', '567 Vocacional'),
('MODEL', @brand_id, 'M_PET_220', '220 (Cabover)');

-- MACK (Brand ID: 418)
SET @brand_id = 418;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_MAC_ANTHEM', 'Mack Anthem'),
('MODEL', @brand_id, 'M_MAC_GRANITE','Mack Granite (Mina/Const)'),
('MODEL', @brand_id, 'M_MAC_PINN',   'Mack Pinnacle');

-- ── 3. EXPANSIÓN DE MAQUINARIA PESADA ─────────────────────────────────────

-- KOMATSU (Brand ID: 438)
SET @brand_id = 438;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_KOM_PC200', 'Excavadora PC200'),
('MODEL', @brand_id, 'M_KOM_PC350', 'Excavadora PC350'),
('MODEL', @brand_id, 'M_KOM_D65',   'Tractor D65'),
('MODEL', @brand_id, 'M_KOM_D155',  'Tractor D155 (Mina)'),
('MODEL', @brand_id, 'M_KOM_WA380', 'Cargador WA380'),
('MODEL', @brand_id, 'M_KOM_GD555', 'Motoniveladora GD555');

-- JCB (Brand ID: 436)
SET @brand_id = 436;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_JCB_3CX',   'Retroexcavadora 3CX'),
('MODEL', @brand_id, 'M_JCB_540',   'Telehandler 540-170'),
('MODEL', @brand_id, 'M_JCB_JS220', 'Excavadora JS220');

-- ── 4. EXPANSIÓN DE HERRAMIENTA INDUSTRIAL ────────────────────────────────

-- MAKITA (Brand ID: 443)
SET @brand_id = 443;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_MAK_LXT_D', 'Taladro LXT 18V'),
('MODEL', @brand_id, 'M_MAK_LXT_S', 'Sierra LXT 18V'),
('MODEL', @brand_id, 'M_MAK_XGT_H', 'Rotomartillo XGT 40V');

-- BOSCH (Brand ID: 444)
SET @brand_id = 444;
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_BOS_GBH_2', 'Rotomartillo GBH 2-24'),
('MODEL', @brand_id, 'M_BOS_GSH_11', 'Demoledor GSH 11 E'),
('MODEL', @brand_id, 'M_BOS_GWS',    'Esmeriladora GWS 20-230');

-- FLUKE (Brand ID - NEW)
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 3, 'B_FLUKE', 'Fluke');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_FLUKE');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M_FLU_87V', 'Multímetro 87V'),
('MODEL', @brand_id, 'M_FLU_376', 'Pinza Amperimétrica 376'),
('MODEL', @brand_id, 'M_FLU_TI480','Cámara Térmica Ti480');
