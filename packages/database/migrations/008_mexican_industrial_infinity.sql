-- =============================================================================
-- Migration: 008 - Sovereign Industrial Metadata Core (Ultra-Density Deployment)
-- Architecture: Archon Collective v.18.4.0
-- Goal: Absolute market coverage for Mexico (Vehicles, Trucks, Machinery, Tools).
-- =============================================================================

-- ── 1. HELPERS: ROOT ASSET TYPE IDs ──────────────────────────────────────────
SET @at_veh = (SELECT id FROM common_catalogs WHERE code = 'AT_VEH');
SET @at_maq = (SELECT id FROM common_catalogs WHERE code = 'AT_MAQ');
SET @at_her = (SELECT id FROM common_catalogs WHERE code = 'AT_HER');

-- ── 2. BRANDS: VEHICLES & TRUCKS (AT_VEH) ────────────────────────────────────
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', @at_veh, 'B_NISSAN',      'Nissan'),
('BRAND', @at_veh, 'B_TOYOTA',      'Toyota'),
('BRAND', @at_veh, 'B_FORD',        'Ford'),
('BRAND', @at_veh, 'B_CHEVROLET',   'Chevrolet'),
('BRAND', @at_veh, 'B_RAM',         'RAM'),
('BRAND', @at_veh, 'B_VW',          'Volkswagen'),
('BRAND', @at_veh, 'B_MITSUBISHI',  'Mitsubishi'),
('BRAND', @at_veh, 'B_HYUNDAI',     'Hyundai'),
('BRAND', @at_veh, 'B_KIA',         'KIA'),
('BRAND', @at_veh, 'B_MAZDA',       'Mazda'),
('BRAND', @at_veh, 'B_MG',          'MG'),
('BRAND', @at_veh, 'B_BYD',         'BYD'),
('BRAND', @at_veh, 'B_JAC',         'JAC'),
('BRAND', @at_veh, 'B_GWM',         'GWM'),
('BRAND', @at_veh, 'B_OMODA',       'Omoda'),
('BRAND', @at_veh, 'B_CHANGAN',     'Changan'),
('BRAND', @at_veh, 'B_FOTON',       'Foton'),
('BRAND', @at_veh, 'B_HONDA',       'Honda'),
('BRAND', @at_veh, 'B_GMC',         'GMC'),
('BRAND', @at_veh, 'B_JEEP',        'Jeep'),
('BRAND', @at_veh, 'B_KW',          'Kenworth'),
('BRAND', @at_veh, 'B_FRTL',        'Freightliner'),
('BRAND', @at_veh, 'B_INTL',        'International'),
('BRAND', @at_veh, 'B_ISUZU',       'Isuzu'),
('BRAND', @at_veh, 'B_HINO',        'Hino'),
('BRAND', @at_veh, 'B_MERCEDES_T',  'Mercedes-Benz Trucks'),
('BRAND', @at_veh, 'B_SCANIA',      'Scania'),
('BRAND', @at_veh, 'B_VOLVO_T',     'Volvo Trucks'),
('BRAND', @at_veh, 'B_MACK',        'Mack'),
('BRAND', @at_veh, 'B_WESTERN',     'Western Star');

-- ── 3. MODELS: PASSENGER & LIGHT COMMERCIAL (AT_VEH) ─────────────────────────

-- NISSAN (MEXICO LEAD)
SET @b_nissan = (SELECT id FROM common_catalogs WHERE code = 'B_NISSAN');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_nissan, 'M_NP300_CH',  'NP300 Chasis'),
('MODEL', @b_nissan, 'M_NP300_ES',  'NP300 Estaquitas'),
('MODEL', @b_nissan, 'M_NP300_PU',  'NP300 Pick Up'),
('MODEL', @b_nissan, 'M_FRONT_S',   'Frontier S'),
('MODEL', @b_nissan, 'M_FRONT_XE',  'Frontier XE'),
('MODEL', @b_nissan, 'M_FRONT_LE',  'Frontier LE'),
('MODEL', @b_nissan, 'M_FRONT_PRO', 'Frontier Pro-4X'),
('MODEL', @b_nissan, 'M_URVAN_CG',  'Urvan Carga'),
('MODEL', @b_nissan, 'M_URVAN_PS',  'Urvan Pasajeros'),
('MODEL', @b_nissan, 'M_URVAN_PN',  'Urvan Panel'),
('MODEL', @b_nissan, 'M_MARCH_SN',  'March Sense'),
('MODEL', @b_nissan, 'M_MARCH_AD',  'March Advance'),
('MODEL', @b_nissan, 'M_MARCH_EX',  'March Exclusive'),
('MODEL', @b_nissan, 'M_VERSA',     'Versa'),
('MODEL', @b_nissan, 'M_SENTRA',    'Sentra'),
('MODEL', @b_nissan, 'M_KICKS',     'Kicks'),
('MODEL', @b_nissan, 'M_XTRAIL',    'X-Trail'),
('MODEL', @b_nissan, 'M_PATH',      'Pathfinder'),
('MODEL', @b_nissan, 'M_ARMADA',    'Armada'),
('MODEL', @b_nissan, 'M_NV3500',    'NV3500');

-- TOYOTA
SET @b_toyota = (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_toyota, 'M_HILUX_G',   'Hilux Gasolina'),
('MODEL', @b_toyota, 'M_HILUX_D',   'Hilux Diésel'),
('MODEL', @b_toyota, 'M_TACOMA',    'Tacoma'),
('MODEL', @b_toyota, 'M_HIACE_PN',  'Hiace Panel'),
('MODEL', @b_toyota, 'M_HIACE_VN',  'Hiace Ventanas'),
('MODEL', @b_toyota, 'M_AVANZA',    'Avanza'),
('MODEL', @b_toyota, 'M_RAV4',      'RAV4'),
('MODEL', @b_toyota, 'M_COROLLA',   'Corolla'),
('MODEL', @b_toyota, 'M_COR_CROSS', 'Corolla Cross'),
('MODEL', @b_toyota, 'M_TUNDRA',    'Tundra'),
('MODEL', @b_toyota, 'M_SEQUOIA',   'Sequoia'),
('MODEL', @b_toyota, 'M_SIENNA',    'Sienna'),
('MODEL', @b_toyota, 'M_CAMRY',     'Camry'),
('MODEL', @b_toyota, 'M_YARIS_S',   'Yaris Sedán'),
('MODEL', @b_toyota, 'M_YARIS_H',   'Yaris Hatchback'),
('MODEL', @b_toyota, 'M_RAIZE',     'Raize');

-- FORD
SET @b_ford = (SELECT id FROM common_catalogs WHERE code = 'B_FORD');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_ford, 'M_F150_V6',   'F-150 / Lobo V6'),
('MODEL', @b_ford, 'M_F150_V8',   'F-150 / Lobo V8'),
('MODEL', @b_ford, 'M_F150_RAP',  'F-150 / Lobo Raptor'),
('MODEL', @b_ford, 'M_F150_PB',   'F-150 PowerBoost'),
('MODEL', @b_ford, 'M_RANG_LAR',  'Ranger Lariat'),
('MODEL', @b_ford, 'M_RANG_XLT',  'Ranger XLT'),
('MODEL', @b_ford, 'M_TRANS_CG',  'Transit Carga'),
('MODEL', @b_ford, 'M_TRANS_PS',  'Transit Pasajeros'),
('MODEL', @b_ford, 'M_TRANS_CR',  'Transit Courier'),
('MODEL', @b_ford, 'M_F250_SD',   'F-250 Super Duty'),
('MODEL', @b_ford, 'M_F350_SD',   'F-350 Super Duty'),
('MODEL', @b_ford, 'M_F450_SD',   'F-450 Super Duty'),
('MODEL', @b_ford, 'M_F550_SD',   'F-550 Super Duty'),
('MODEL', @b_ford, 'M_MAVERICK',  'Maverick'),
('MODEL', @b_ford, 'M_EXPLORER',  'Explorer'),
('MODEL', @b_ford, 'M_EXPED',    'Expedition'),
('MODEL', @b_ford, 'M_MACH_E',    'Mustang Mach-E');

-- CHEVROLET
SET @b_chevy = (SELECT id FROM common_catalogs WHERE code = 'B_CHEVROLET');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_chevy, 'M_S10_CH',    'S10 Max Chasis'),
('MODEL', @b_chevy, 'M_S10_DC',    'S10 Max Doble Cabina'),
('MODEL', @b_chevy, 'M_SILVERADO', 'Silverado / Cheyenne'),
('MODEL', @b_chevy, 'M_COLORADO',  'Colorado'),
('MODEL', @b_chevy, 'M_TORNADO',   'Tornado Van'),
('MODEL', @b_chevy, 'M_AVEO',      'Aveo (Staff)'),
('MODEL', @b_chevy, 'M_CAPTIVA',   'Captiva'),
('MODEL', @b_chevy, 'M_GROOVE',    'Groove'),
('MODEL', @b_chevy, 'M_TAHOE',     'Tahoe'),
('MODEL', @b_chevy, 'M_SUBURBAN',  'Suburban'),
('MODEL', @b_chevy, 'M_TRAVERSE',  'Traverse'),
('MODEL', @b_chevy, 'M_EXPRESS',   'Express');

-- RAM
SET @b_ram = (SELECT id FROM common_catalogs WHERE code = 'B_RAM');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_ram, 'M_RAM_700_SL',  'Ram 700 SLT'),
('MODEL', @b_ram, 'M_RAM_700_LA',  'Ram 700 Laramie'),
('MODEL', @b_ram, 'M_RAM_700_BH',  'Ram 700 Bighorn'),
('MODEL', @b_ram, 'M_RAM_1200',    'Ram 1200'),
('MODEL', @b_ram, 'M_RAM_1500_M',  'Ram 1500 Mild Hybrid'),
('MODEL', @b_ram, 'M_RAM_1500_T',  'Ram 1500 TRX'),
('MODEL', @b_ram, 'M_RAM_2500',    'Ram 2500 HD'),
('MODEL', @b_ram, 'M_RAM_4000',    'Ram 4000 Chasis'),
('MODEL', @b_ram, 'M_PRO_2500',    'Promaster 2500'),
('MODEL', @b_ram, 'M_PRO_RAPID',   'Promaster Rapid');

-- VW
SET @b_vw = (SELECT id FROM common_catalogs WHERE code = 'B_VW');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_vw, 'M_AMAROK_V6',  'Amarok V6'),
('MODEL', @b_vw, 'M_SAVEIRO',    'Saveiro'),
('MODEL', @b_vw, 'M_TRANS_T6',   'Transporter T6'),
('MODEL', @b_vw, 'M_CRAFT_CG',   'Crafter Carga'),
('MODEL', @b_vw, 'M_CRAFT_PS',   'Crafter Pasajeros'),
('MODEL', @b_vw, 'M_JETTA',      'Jetta'),
('MODEL', @b_vw, 'M_TIGUAN',     'Tiguan'),
('MODEL', @b_vw, 'M_TAOS',       'Taos'),
('MODEL', @b_vw, 'M_NIVUS',      'Nivus'),
('MODEL', @b_vw, 'M_TERAMONT',   'Teramont');

-- HYUNDAI / KIA
SET @b_hyundai = (SELECT id FROM common_catalogs WHERE code = 'B_HYUNDAI');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_hyundai, 'M_H100_CH', 'H100 Chasis'),
('MODEL', @b_hyundai, 'M_H100_PN', 'H100 Panel'),
('MODEL', @b_hyundai, 'M_STARIA',  'Staria'),
('MODEL', @b_hyundai, 'M_TUCSON',  'Tucson'),
('MODEL', @b_hyundai, 'M_SANTAFE', 'Santa Fe');

SET @b_kia = (SELECT id FROM common_catalogs WHERE code = 'B_KIA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_kia, 'M_RIO',      'Rio'),
('MODEL', @b_kia, 'M_FORTE',    'Forte'),
('MODEL', @b_kia, 'M_SPORTAGE', 'Sportage'),
('MODEL', @b_kia, 'M_SORENTO',  'Sorento');

-- MAZDA / HONDA
SET @b_mazda = (SELECT id FROM common_catalogs WHERE code = 'B_MAZDA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_mazda, 'M_MAZDA3', 'Mazda 3'),
('MODEL', @b_mazda, 'M_CX3',    'CX-3'),
('MODEL', @b_mazda, 'M_CX5',    'CX-5'),
('MODEL', @b_mazda, 'M_CX30',   'CX-30'),
('MODEL', @b_mazda, 'M_CX50',   'CX-50'),
('MODEL', @b_mazda, 'M_CX90',   'CX-90');

SET @b_honda = (SELECT id FROM common_catalogs WHERE code = 'B_HONDA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_honda, 'M_CRV',    'CR-V'),
('MODEL', @b_honda, 'M_HRV',    'HR-V'),
('MODEL', @b_honda, 'M_CIVIC',  'Civic'),
('MODEL', @b_honda, 'M_ODYSSEY','Odyssey');

-- NEW CHINESE PLAYERS (MG, BYD, JAC, GWM, OMODA, CHANGAN)
SET @b_mg = (SELECT id FROM common_catalogs WHERE code = 'B_MG');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_mg, 'M_MG5', 'MG5'),
('MODEL', @b_mg, 'M_MG_ZS', 'ZS'),
('MODEL', @b_mg, 'M_MG_HS', 'HS'),
('MODEL', @b_mg, 'M_MG_RX5', 'RX5'),
('MODEL', @b_mg, 'M_MG_ONE', 'One');

SET @b_byd = (SELECT id FROM common_catalogs WHERE code = 'B_BYD');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_byd, 'M_BYD_YUAN', 'Yuan Plus'),
('MODEL', @b_byd, 'M_BYD_DOLP', 'Dolphin'),
('MODEL', @b_byd, 'M_BYD_SEAL', 'Seal'),
('MODEL', @b_byd, 'M_BYD_HAN', 'Han');

SET @b_jac = (SELECT id FROM common_catalogs WHERE code = 'B_JAC');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_jac, 'M_JAC_T6',  'Frison T6'),
('MODEL', @b_jac, 'M_JAC_T8',  'Frison T8'),
('MODEL', @b_jac, 'M_JAC_T9',  'Frison T9'),
('MODEL', @b_jac, 'M_JAC_SUN', 'Sunray'),
('MODEL', @b_jac, 'M_JAC_S2',  'Sei 2'),
('MODEL', @b_jac, 'M_JAC_S3',  'Sei 3'),
('MODEL', @b_jac, 'M_JAC_S4',  'Sei 4'),
('MODEL', @b_jac, 'M_JAC_S7',  'Sei 7');

SET @b_gwm = (SELECT id FROM common_catalogs WHERE code = 'B_GWM');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_gwm, 'M_GWM_JOL', 'Haval Jolion'),
('MODEL', @b_gwm, 'M_GWM_CAN', 'Poer Cannon');

SET @b_omoda = (SELECT id FROM common_catalogs WHERE code = 'OMODA'); -- wait, code was B_OMODA
SET @b_omoda = (SELECT id FROM common_catalogs WHERE code = 'B_OMODA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_omoda, 'M_OMODA_C5', 'Omoda C5');

SET @b_changan = (SELECT id FROM common_catalogs WHERE code = 'B_CHANGAN');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_changan, 'M_ALTSVIN', 'Alsvin');

-- ── 4. MODELS: HEAVY DUTY & LOGISTICS (AT_VEH) ───────────────────────────────

-- KENWORTH
SET @b_kw = (SELECT id FROM common_catalogs WHERE code = 'B_KW');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_kw, 'M_T680_NG',  'T680 Next Gen'),
('MODEL', @b_kw, 'M_T880_VOC',  'T880 Vocacional'),
('MODEL', @b_kw, 'M_T370_REP',  'T370 Reparto'),
('MODEL', @b_kw, 'M_T470',      'T470'),
('MODEL', @b_kw, 'M_KW55',      'KW55'),
('MODEL', @b_kw, 'M_W900',      'W900'),
('MODEL', @b_kw, 'M_T2000',     'T2000');

-- FREIGHTLINER
SET @b_frtl = (SELECT id FROM common_catalogs WHERE code = 'B_FRTL');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_frtl, 'M_CASC_CL',  'Cascadia Classic'),
('MODEL', @b_frtl, 'M_CASC_NW',  'New Cascadia'),
('MODEL', @b_frtl, 'M_M2_106',   'M2 Business Class 106'),
('MODEL', @b_frtl, 'M_M2_112',   'M2 Business Class 112'),
('MODEL', @b_frtl, 'M_CORONADO', 'Coronado'),
('MODEL', @b_frtl, 'M_SD122',    'SD122');

-- INTERNATIONAL
SET @b_intl = (SELECT id FROM common_catalogs WHERE code = 'B_INTL');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_intl, 'M_INTL_LT',  'LT (ProStar)'),
('MODEL', @b_intl, 'M_INTL_MV',  'MV (CityStar)'),
('MODEL', @b_intl, 'M_INTL_HV',  'HV (WorkStar)'),
('MODEL', @b_intl, 'M_INTL_LONE','LoneStar'),
('MODEL', @b_intl, 'M_INTL_HX',  'HX (Minería)');

-- ISUZU / HINO
SET @b_isuzu = (SELECT id FROM common_catalogs WHERE code = 'B_ISUZU');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_isuzu, 'M_ELF_100', 'ELF 100'),
('MODEL', @b_isuzu, 'M_ELF_200', 'ELF 200'),
('MODEL', @b_isuzu, 'M_ELF_300', 'ELF 300'),
('MODEL', @b_isuzu, 'M_ELF_400', 'ELF 400'),
('MODEL', @b_isuzu, 'M_ELF_500', 'ELF 500'),
('MODEL', @b_isuzu, 'M_ELF_600', 'ELF 600'),
('MODEL', @b_isuzu, 'M_FOR_800', 'Forward 800'),
('MODEL', @b_isuzu, 'M_FOR_1100','Forward 1100'),
('MODEL', @b_isuzu, 'M_FOR_1400','Forward 1400');

SET @b_hino = (SELECT id FROM common_catalogs WHERE code = 'B_HINO');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_hino, 'M_H300_514',  'Serie 300 - 514'),
('MODEL', @b_hino, 'M_H300_614',  'Serie 300 - 614'),
('MODEL', @b_hino, 'M_H300_716',  'Serie 300 - 716'),
('MODEL', @b_hino, 'M_H300_816',  'Serie 300 - 816'),
('MODEL', @b_hino, 'M_H500_1018', 'Serie 500 - 1018'),
('MODEL', @b_hino, 'M_H500_1724', 'Serie 500 - 1724'),
('MODEL', @b_hino, 'M_H700_2628', 'Serie 700 - 2628');

-- MERCEDES-BENZ / SCANIA / VOLVO TRUCKS
SET @b_mercz = (SELECT id FROM common_catalogs WHERE code = 'B_MERCEDES_T');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_mercz, 'M_ACTROS', 'Actros'),
('MODEL', @b_mercz, 'M_AXOR',   'Axor'),
('MODEL', @b_mercz, 'M_ATEGO',  'Atego'),
('MODEL', @b_mercz, 'M_ZETROS', 'Zetros'),
('MODEL', @b_mercz, 'M_ACCELO', 'Accelo');

SET @b_scania = (SELECT id FROM common_catalogs WHERE code = 'B_SCANIA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_scania, 'M_SCANIA_G', 'Serie G'),
('MODEL', @b_scania, 'M_SCANIA_R', 'Serie R'),
('MODEL', @b_scania, 'M_SCANIA_P', 'Serie P'),
('MODEL', @b_scania, 'M_SCANIA_S', 'Serie S');

SET @b_volvt = (SELECT id FROM common_catalogs WHERE code = 'B_VOLVO_T');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_volvt, 'M_VNL_760', 'VNL 760'),
('MODEL', @b_volvt, 'M_VNL_860', 'VNL 860'),
('MODEL', @b_volvt, 'M_VNR',     'VNR'),
('MODEL', @b_volvt, 'M_VHD',     'VHD');

-- ── 5. MODELS: HEAVY MACHINERY & YELLOW IRON (AT_MAQ) ────────────────────────

-- CATERPILLAR
SET @b_cat = (SELECT id FROM common_catalogs WHERE code = 'B_CAT');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_cat, 'M_CAT_320',  'Excavadora 320'),
('MODEL', @b_cat, 'M_CAT_336',  'Excavadora 336'),
('MODEL', @b_cat, 'M_CAT_349',  'Excavadora 349'),
('MODEL', @b_cat, 'M_CAT_395',  'Excavadora 395'),
('MODEL', @b_cat, 'M_CAT_305',  'Mini Excavadora 305'),
('MODEL', @b_cat, 'M_CAT_416',  'Retroexcavadora 416'),
('MODEL', @b_cat, 'M_CAT_420',  'Retroexcavadora 420'),
('MODEL', @b_cat, 'M_CAT_430',  'Retroexcavadora 430'),
('MODEL', @b_cat, 'M_CAT_450',  'Retroexcavadora 450'),
('MODEL', @b_cat, 'M_CAT_D5',   'Tractor D5'),
('MODEL', @b_cat, 'M_CAT_D6',   'Tractor D6'),
('MODEL', @b_cat, 'M_CAT_D8',   'Tractor D8'),
('MODEL', @b_cat, 'M_CAT_D11',  'Tractor D11'),
('MODEL', @b_cat, 'M_CAT_120',  'Motoniveladora 120'),
('MODEL', @b_cat, 'M_CAT_140',  'Motoniveladora 140'),
('MODEL', @b_cat, 'M_CAT_160',  'Motoniveladora 160'),
('MODEL', @b_cat, 'M_CAT_950',  'Cargador Frontal 950'),
('MODEL', @b_cat, 'M_CAT_966',  'Cargador Frontal 966'),
('MODEL', @b_cat, 'M_CAT_988',  'Cargador Frontal 988');

-- JOHN DEERE / KOMATSU
SET @b_jd = (SELECT id FROM common_catalogs WHERE code = 'B_JD');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_jd, 'M_JD_310L', 'Retro 310L'),
('MODEL', @b_jd, 'M_JD_410L', 'Retro 410L'),
('MODEL', @b_jd, 'M_JD_6115J','Tractor 6115J (Agro)');

SET @b_kom = (SELECT id FROM common_catalogs WHERE code = 'B_KOM');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_kom, 'M_KOM_PC200','PC200'),
('MODEL', @b_kom, 'M_KOM_PC450','PC450'),
('MODEL', @b_kom, 'M_KOM_D65', 'D65'),
('MODEL', @b_kom, 'M_KOM_GD555','GD555');

-- SANY / XCMG / LIUGONG
SET @b_sany = (SELECT id FROM common_catalogs WHERE code = 'B_SANY');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_sany, 'M_SANY_SY215', 'SY215'),
('MODEL', @b_sany, 'M_SANY_SY365', 'SY365');

SET @b_xcmg = (SELECT id FROM common_catalogs WHERE code = 'B_XCMG');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_xcmg, 'M_XCMG_XE215', 'XE215'),
('MODEL', @b_xcmg, 'M_XCMG_XE370', 'XE370');

-- ── 6. MODELS: ELEVATION & FORKLIFTS (AT_MAQ) ────────────────────────────────

-- ELEVATION (GENIE, JLG, SKYJACK)
SET @b_genie = (SELECT id FROM common_catalogs WHERE code = 'B_GENIE');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_genie, 'M_GEN_GS1930', 'GS-1930 (Tijera)'),
('MODEL', @b_genie, 'M_GEN_Z45',    'Z-45 (Brazo)');

SET @b_skyj = (SELECT id FROM common_catalogs WHERE code = 'B_JLG'); -- wait, B_JLG is JLG
SET @b_jlg = (SELECT id FROM common_catalogs WHERE code = 'B_JLG');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_jlg, 'M_JLG_3246ES', '3246ES'),
('MODEL', @b_jlg, 'M_JLG_450AJ',  '450AJ'),
('MODEL', @b_jlg, 'M_JLG_Z60',    'Z-60');

-- MATERIAL HANDLING (FORKLIFTS)
SET @b_hyster = (SELECT id FROM common_catalogs WHERE code = 'B_HYSTER');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_hyster, 'M_HYS_H50',  'H50FT (2.5T)'),
('MODEL', @b_hyster, 'M_HYS_H155', 'H155FT (7T)');

SET @b_yale = (SELECT id FROM common_catalogs WHERE code = 'B_YALE');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_yale, 'M_YALE_GP050', 'GP050VX');

SET @b_crown = (SELECT id FROM common_catalogs WHERE code = 'B_CROWN');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_crown, 'M_CRW_SC', 'Serie SC'),
('MODEL', @b_crown, 'M_CRW_RC', 'Serie RC');

-- ── 7. MODELS: TOOLS & INDUSTRIAL (AT_HER) ───────────────────────────────────

-- MILWAUKEE
SET @b_milw = (SELECT id FROM common_catalogs WHERE code = 'B_MILWAUKEE');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_milw, 'M_M18_IMP12', 'M18 Fuel Impact 1/2'),
('MODEL', @b_milw, 'M_M18_IMP34', 'M18 Fuel Impact 3/4'),
('MODEL', @b_milw, 'M_M18_IMP1',  'M18 Fuel Impact 1'),
('MODEL', @b_milw, 'M_M12_DIAG',  'M12 Diagnostic'),
('MODEL', @b_milw, 'M_ROCK_LIT',  'Torres Lighting Rocket');

-- HILTI
SET @b_hilti = (SELECT id FROM common_catalogs WHERE code = 'B_HILTI');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_hilti, 'M_TE_70',    'Rotomartillo TE 70'),
('MODEL', @b_hilti, 'M_TE_80',    'Rotomartillo TE 80'),
('MODEL', @b_hilti, 'M_TE_3000',  'Demoledor TE 3000'),
('MODEL', @b_hilti, 'M_DD_150',   'Core Drill DD 150'),
('MODEL', @b_hilti, 'M_PS_1000',  'Scanner PS 1000');

-- DEWALT / MAKITA
SET @b_dewalt = (SELECT id FROM common_catalogs WHERE code = 'B_DEWALT');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_dewalt, 'M_DW_20VMAX', 'Línea 20V Max'),
('MODEL', @b_dewalt, 'M_DW_FLEXV',  'Línea FlexVolt 60V');

SET @b_makita = (SELECT id FROM common_catalogs WHERE code = 'B_MAKITA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_makita, 'M_MAK_XGT', 'Línea XGT 40V');

-- FLUKE / INDUSTRIAL
SET @b_fluke = (SELECT id FROM common_catalogs WHERE code = 'B_FLUKE');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @b_fluke, 'M_87V',      'Multímetro 87V'),
('MODEL', @b_fluke, 'M_TI480',    'Cámara Térmica Ti480');

-- =============================================================================
-- MIGRATION COMPLETE: SOVEREIGN METADATA CORE v.18.4.0
-- =============================================================================
