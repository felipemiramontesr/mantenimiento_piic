-- =============================================================================
-- Migration: 022 - Master Hierarchical Restoration & Mega Catalog
-- Architecture: Archon Sovereign v37.1.0
-- Goal: Unifies linking Brands to Asset Types AND massively injects Model dependencies.
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SESSION sql_mode = '';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RESOLVE ASSET TYPE ANCHORS
-- ─────────────────────────────────────────────────────────────────────────────
SET @at_veh = (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1);
SET @at_maq = (SELECT id FROM common_catalogs WHERE code = 'AT_MAQ' LIMIT 1);
SET @at_her = (SELECT id FROM common_catalogs WHERE code = 'AT_HER' LIMIT 1);

-- Fallback safely
SET @at_veh = IFNULL(@at_veh, 1);
SET @at_maq = IFNULL(@at_maq, 2);
SET @at_her = IFNULL(@at_her, 3);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. LINK ALL BRANDS TO THEIR RESPECTIVE PROPER ASSET TYPE PARENT
-- ─────────────────────────────────────────────────────────────────────────────
-- Vehiculos:
UPDATE common_catalogs SET parent_id = @at_veh WHERE category = 'BRAND' AND code IN (
    'B_NISSAN', 'B_FORD', 'B_CHEVROLET', 'B_RAM', 'B_VW', 'B_MITSUBISHI', 'B_HYUNDAI', 
    'B_KIA', 'B_MAZDA', 'B_MG', 'B_CHANGAN', 'B_KW', 'B_FRTL', 'B_INTL', 'B_ISUZU', 
    'B_HINO', 'B_MERCEDES_T', 'B_SCANIA', 'B_VOLVO_T', 'B_TOYOTA', 'B_HONDA', 'B_SUZUKI',
    'B_JAC', 'B_BYD', 'B_CHIREY', 'B_OMODA', 'B_GWM', 'B_SHACMAN', 'B_SITRAK', 'B_FOTON',
    'B_GMC', 'B_JEEP', 'B_CADILLAC', 'B_BUICK', 'B_PETERBILT', 'B_MACK'
);

-- Maquinaria:
UPDATE common_catalogs SET parent_id = @at_maq WHERE category = 'BRAND' AND code IN (
    'B_CAT', 'B_JD', 'B_KOM', 'B_BOBCAT', 'B_JCB', 'B_VOLVO_CE', 'B_KOMATSU'
);

-- Herramientas:
UPDATE common_catalogs SET parent_id = @at_her WHERE category = 'BRAND' AND code IN (
    'B_MILWAUKEE', 'B_DEWALT', 'B_HILTI', 'B_MAKITA', 'B_BOSCH'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. INJECT & RELINK THE MEGA MODEL CATALOG BY BRAND (2000 - 2026)
-- ─────────────────────────────────────────────────────────────────────────────
-- It uses ON DUPLICATE KEY UPDATE to ensure if the model existed but was orphaned, it gets re-linked securely. 

-- [ NISSAN ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_NISSAN' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_NIS_NP300', 'NP300 / Frontier'),
('MODEL', @brand_id, 'M_NIS_URVAN', 'Urvan NV350'),
('MODEL', @brand_id, 'M_NIS_MARCH', 'March'),
('MODEL', @brand_id, 'M_NIS_VERSA', 'Versa'),
('MODEL', @brand_id, 'M_NIS_SENTRA', 'Sentra'),
('MODEL', @brand_id, 'M_NIS_KICKS', 'Kicks'),
('MODEL', @brand_id, 'M_NIS_XTR', 'X-Trail'),
('MODEL', @brand_id, 'M_NIS_PATH', 'Pathfinder')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ FORD ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_FORD' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_FORD_F150', 'F-150 / Lobo'),
('MODEL', @brand_id, 'M_FORD_F250', 'F-250 Super Duty'),
('MODEL', @brand_id, 'M_FORD_F350', 'F-350 Super Duty'),
('MODEL', @brand_id, 'M_FORD_F450', 'F-450 Super Duty'),
('MODEL', @brand_id, 'M_FORD_F550', 'F-550 Super Duty'),
('MODEL', @brand_id, 'M_FORD_RANG', 'Ranger'),
('MODEL', @brand_id, 'M_FORD_TRANS', 'Transit Vagoneta/Cargo'),
('MODEL', @brand_id, 'M_FORD_MAV', 'Maverick'),
('MODEL', @brand_id, 'M_FORD_EXP', 'Explorer'),
('MODEL', @brand_id, 'M_FORD_EXPD', 'Expedition')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ CHEVROLET ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CHEVROLET' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_CHV_SIL15', 'Silverado 1500 / Cheyenne'),
('MODEL', @brand_id, 'M_CHV_SIL25', 'Silverado 2500'),
('MODEL', @brand_id, 'M_CHV_SIL35', 'Silverado 3500'),
('MODEL', @brand_id, 'M_CHV_COL', 'Colorado'),
('MODEL', @brand_id, 'M_CHV_S10', 'S10 Max'),
('MODEL', @brand_id, 'M_CHV_TOR', 'Tornado / Tornado Van'),
('MODEL', @brand_id, 'M_CHV_EXP', 'Express Cargo/Pasajeros'),
('MODEL', @brand_id, 'M_CHV_SUB', 'Suburban'),
('MODEL', @brand_id, 'M_CHV_TAH', 'Tahoe'),
('MODEL', @brand_id, 'M_CHV_ONIX', 'Onix'),
('MODEL', @brand_id, 'M_CHV_AVEO', 'Aveo'),
('MODEL', @brand_id, 'M_CHV_CAP', 'Captiva')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ RAM ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_RAM' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_RAM_700', 'Ram 700'),
('MODEL', @brand_id, 'M_RAM_1500', 'Ram 1500'),
('MODEL', @brand_id, 'M_RAM_2500', 'Ram 2500'),
('MODEL', @brand_id, 'M_RAM_3500', 'Ram 3500 Heavy Duty'),
('MODEL', @brand_id, 'M_RAM_4000', 'Ram 4000 Chassis Cab'),
('MODEL', @brand_id, 'M_RAM_PROM', 'ProMaster'),
('MODEL', @brand_id, 'M_RAM_PROR', 'ProMaster Rapid')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ VOLKSWAGEN ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_VW' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_VW_AMR', 'Amarok'),
('MODEL', @brand_id, 'M_VW_SAV', 'Saveiro'),
('MODEL', @brand_id, 'M_VW_CRA', 'Crafter'),
('MODEL', @brand_id, 'M_VW_TRA', 'Transporter / Multivan'),
('MODEL', @brand_id, 'M_VW_CAD', 'Caddy Cargo'),
('MODEL', @brand_id, 'M_VW_JET', 'Jetta'),
('MODEL', @brand_id, 'M_VW_VEN', 'Vento'),
('MODEL', @brand_id, 'M_VW_VIR', 'Virtus'),
('MODEL', @brand_id, 'M_VW_TAO', 'Taos'),
('MODEL', @brand_id, 'M_VW_TIG', 'Tiguan')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ MITSUBISHI ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MITSUBISHI' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_MIT_L200', 'L200 Pick Up'),
('MODEL', @brand_id, 'M_MIT_OUT', 'Outlander'),
('MODEL', @brand_id, 'M_MIT_MON', 'Montero Sport'),
('MODEL', @brand_id, 'M_MIT_XPA', 'Xpander'),
('MODEL', @brand_id, 'M_MIT_MIR', 'Mirage G4')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ HYUNDAI ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_HYUNDAI' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_HYU_H100', 'H100 Diésel (Camión Ligero)'),
('MODEL', @brand_id, 'M_HYU_STA', 'Starex / Staria'),
('MODEL', @brand_id, 'M_HYU_CRE', 'Creta'),
('MODEL', @brand_id, 'M_HYU_TUC', 'Tucson'),
('MODEL', @brand_id, 'M_HYU_SFE', 'Santa Fe'),
('MODEL', @brand_id, 'M_HYU_ELA', 'Elantra'),
('MODEL', @brand_id, 'M_HYU_I10', 'Grand i10')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ KIA ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_KIA' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_KIA_K2700', 'K2700 / Bongo (Camión Ligero)'),
('MODEL', @brand_id, 'M_KIA_RIO', 'Rio'),
('MODEL', @brand_id, 'M_KIA_K3', 'K3'),
('MODEL', @brand_id, 'M_KIA_FOR', 'Forte'),
('MODEL', @brand_id, 'M_KIA_SPO', 'Sportage'),
('MODEL', @brand_id, 'M_KIA_SOR', 'Sorento'),
('MODEL', @brand_id, 'M_KIA_SEL', 'Seltos')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ MAZDA ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MAZDA' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_MAZ_BT50', 'BT-50 Pick Up'),
('MODEL', @brand_id, 'M_MAZ_M3', 'Mazda3'),
('MODEL', @brand_id, 'M_MAZ_CX5', 'CX-5'),
('MODEL', @brand_id, 'M_MAZ_CX30', 'CX-30')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ MG ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MG' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_MG_5', 'MG5'),
('MODEL', @brand_id, 'M_MG_GT', 'MG GT'),
('MODEL', @brand_id, 'M_MG_ZS', 'ZS'),
('MODEL', @brand_id, 'M_MG_HS', 'HS'),
('MODEL', @brand_id, 'M_MG_RX8', 'RX8')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ CHANGAN ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CHANGAN' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_CHA_HUN', 'Hunter Pick Up'),
('MODEL', @brand_id, 'M_CHA_ALS', 'Alsvin'),
('MODEL', @brand_id, 'M_CHA_CS35', 'CS35 Plus'),
('MODEL', @brand_id, 'M_CHA_CS55', 'CS55 Plus')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ KENWORTH ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_KW' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_KW_T680', 'T680'),
('MODEL', @brand_id, 'M_KW_T880', 'T880'),
('MODEL', @brand_id, 'M_KW_T370', 'T370'),
('MODEL', @brand_id, 'M_KW_T800', 'T800'),
('MODEL', @brand_id, 'M_KW_W900', 'W900')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ FREIGHTLINER ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_FRTL' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_FR_CAS', 'Cascadia'),
('MODEL', @brand_id, 'M_FR_M2106', 'M2 106'),
('MODEL', @brand_id, 'M_FR_M2112', 'M2 112'),
('MODEL', @brand_id, 'M_FR_COL', 'Columbia')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ INTERNATIONAL ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_INTL' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_IN_LON', 'LoneStar'),
('MODEL', @brand_id, 'M_IN_PRO', 'ProStar'),
('MODEL', @brand_id, 'M_IN_LT', 'LT Series'),
('MODEL', @brand_id, 'M_IN_MV', 'MV Series')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ ISUZU ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_ISUZU' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_ISU_E100', 'ELF 100'),
('MODEL', @brand_id, 'M_ISU_E200', 'ELF 200'),
('MODEL', @brand_id, 'M_ISU_E300', 'ELF 300 / 400'),
('MODEL', @brand_id, 'M_ISU_E500', 'ELF 500 / 600'),
('MODEL', @brand_id, 'M_ISU_FWD', 'Forward 800 / 1100')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ HINO ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_HINO' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_HIN_S300', 'Serie 300'),
('MODEL', @brand_id, 'M_HIN_S500', 'Serie 500')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ MERCEDES-BENZ ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MERCEDES_T' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_MB_SPR', 'Sprinter Cargo/Pasaje'),
('MODEL', @brand_id, 'M_MB_VIT', 'Vito'),
('MODEL', @brand_id, 'M_MB_ACT', 'Actros'),
('MODEL', @brand_id, 'M_MB_ATE', 'Atego')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ SCANIA ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_SCANIA' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_SCA_R', 'Serie R'),
('MODEL', @brand_id, 'M_SCA_G', 'Serie G'),
('MODEL', @brand_id, 'M_SCA_P', 'Serie P'),
('MODEL', @brand_id, 'M_SCA_S', 'Serie S')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ VOLVO TRUCKS ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_VOLVO_T' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_VOL_VNL', 'VNL'),
('MODEL', @brand_id, 'M_VOL_VNR', 'VNR'),
('MODEL', @brand_id, 'M_VOL_FH', 'FH Series'),
('MODEL', @brand_id, 'M_VOL_FMX', 'FMX Series')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ TOYOTA ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_TOY_HIL', 'Hilux'),
('MODEL', @brand_id, 'M_TOY_TAC', 'Tacoma'),
('MODEL', @brand_id, 'M_TOY_TUN', 'Tundra'),
('MODEL', @brand_id, 'M_TOY_HIA', 'Hiace Pasajeros/Panel'),
('MODEL', @brand_id, 'M_TOY_RAV', 'RAV4'),
('MODEL', @brand_id, 'M_TOY_COR', 'Corolla'),
('MODEL', @brand_id, 'M_TOY_YAR', 'Yaris'),
('MODEL', @brand_id, 'M_TOY_AVA', 'Avanza')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ HONDA ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_HONDA' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_HON_CRV', 'CR-V'),
('MODEL', @brand_id, 'M_HON_HRV', 'HR-V'),
('MODEL', @brand_id, 'M_HON_CIV', 'Civic'),
('MODEL', @brand_id, 'M_HON_CIT', 'City'),
('MODEL', @brand_id, 'M_HON_ACC', 'Accord')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ SUZUKI ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_SUZUKI' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_SUZ_SWI', 'Swift'),
('MODEL', @brand_id, 'M_SUZ_IGN', 'Ignis'),
('MODEL', @brand_id, 'M_SUZ_VIT', 'Vitara'),
('MODEL', @brand_id, 'M_SUZ_ERT', 'Ertiga')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ JAC ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_JAC' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_JAC_FT6', 'Frison T6'),
('MODEL', @brand_id, 'M_JAC_FT8', 'Frison T8'),
('MODEL', @brand_id, 'M_JAC_SUN', 'Sunray Carga'),
('MODEL', @brand_id, 'M_JAC_J7', 'J7'),
('MODEL', @brand_id, 'M_JAC_SEI2', 'Sei2')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ BYD ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_BYD' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_BYD_DOL', 'Dolphin'),
('MODEL', @brand_id, 'M_BYD_SEA', 'Seal'),
('MODEL', @brand_id, 'M_BYD_YUA', 'Yuan Plus'),
('MODEL', @brand_id, 'M_BYD_SHA', 'Shark Pick Up')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ CHIREY ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CHIREY' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_CHI_T2', 'Tiggo 2 Pro'),
('MODEL', @brand_id, 'M_CHI_T4', 'Tiggo 4 Pro'),
('MODEL', @brand_id, 'M_CHI_T7', 'Tiggo 7 Pro'),
('MODEL', @brand_id, 'M_CHI_A8', 'Arrizo 8')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ OMODA ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_OMODA' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_OMO_O5', 'Omoda O5'),
('MODEL', @brand_id, 'M_OMO_C5', 'Omoda C5')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ GWM ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_GWM' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_GWM_POE', 'Poer Pick Up'),
('MODEL', @brand_id, 'M_GWM_H6', 'Haval H6'),
('MODEL', @brand_id, 'M_GWM_JOL', 'Haval Jolion')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ SHACMAN ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_SHACMAN' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_SHA_X3K', 'X3000'),
('MODEL', @brand_id, 'M_SHA_L3K', 'L3000')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ SITRAK ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_SITRAK' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_SIT_C7H', 'C7H'),
('MODEL', @brand_id, 'M_SIT_T5G', 'T5G')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ FOTON ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_FOTON' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_FOT_AUM', 'Auman'),
('MODEL', @brand_id, 'M_FOT_TUN', 'Tunland Pick Up'),
('MODEL', @brand_id, 'M_FOT_VIEW', 'View CS2'),
('MODEL', @brand_id, 'M_FOT_TOA', 'Toano Cargo')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ GMC ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_GMC' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_GMC_SIE', 'Sierra 1500 / HD'),
('MODEL', @brand_id, 'M_GMC_CAN', 'Canyon'),
('MODEL', @brand_id, 'M_GMC_YUK', 'Yukon'),
('MODEL', @brand_id, 'M_GMC_TER', 'Terrain')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ JEEP ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_JEEP' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_JEE_WRA', 'Wrangler'),
('MODEL', @brand_id, 'M_JEE_GC', 'Grand Cherokee'),
('MODEL', @brand_id, 'M_JEE_COM', 'Compass'),
('MODEL', @brand_id, 'M_JEE_REN', 'Renegade'),
('MODEL', @brand_id, 'M_JEE_GLA', 'Gladiator')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ CADILLAC ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CADILLAC' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_CAD_ESC', 'Escalade'),
('MODEL', @brand_id, 'M_CAD_XT4', 'XT4'),
('MODEL', @brand_id, 'M_CAD_XT5', 'XT5')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ BUICK ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_BUICK' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_BUI_ENC', 'Encore'),
('MODEL', @brand_id, 'M_BUI_ENV', 'Envision'),
('MODEL', @brand_id, 'M_BUI_ENCL', 'Enclave')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ PETERBILT ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_PETERBILT' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_PET_389', 'Model 389'),
('MODEL', @brand_id, 'M_PET_579', 'Model 579'),
('MODEL', @brand_id, 'M_PET_337', 'Model 337 / Medium Duty')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ MACK ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MACK' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_MAC_ANT', 'Anthem'),
('MODEL', @brand_id, 'M_MAC_PIN', 'Pinnacle'),
('MODEL', @brand_id, 'M_MAC_GRA', 'Granite')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. INSERT HEAVY MACHINERY MODELS (BONUS / PRO-TIER)
-- ─────────────────────────────────────────────────────────────────────────────
-- [ CATERPILLAR ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CAT' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_CAT_320', 'Excavadora 320'),
('MODEL', @brand_id, 'M_CAT_416', 'Retroexcavadora 416'),
('MODEL', @brand_id, 'M_CAT_140', 'Motoniveladora 140'),
('MODEL', @brand_id, 'M_CAT_D6', 'Tractor Topador D6'),
('MODEL', @brand_id, 'M_CAT_950', 'Cargador Frontal 950')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ KOMATSU ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_KOM' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_KOM_PC200', 'Excavadora PC200'),
('MODEL', @brand_id, 'M_KOM_WA380', 'Cargador WA380'),
('MODEL', @brand_id, 'M_KOM_D65', 'Tractor D65')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);

-- [ JOHN DEERE (JD) ]
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_JD' LIMIT 1);
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES
('MODEL', @brand_id, 'M_JD_310', 'Retroexcavadora 310L'),
('MODEL', @brand_id, 'M_JD_210', 'Excavadora 210G'),
('MODEL', @brand_id, 'M_JD_624', 'Cargador 624P')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id);


SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- SCRIPT FINALIZADO
-- =============================================================================
