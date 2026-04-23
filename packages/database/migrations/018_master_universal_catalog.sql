-- =============================================================================
-- Migration: 018 - Universal Industrial Catalog Expansion (v.30.8.0 - ABSOLUTE SATURATION)
-- Architecture: Archon Sovereign Data Infrastructure
-- Scope: TOTAL Mexican Vehicle Market (25+ Brands with 100% Model Parity)
-- =============================================================================

-- ── 1. HELPERS: ROOT ASSET TYPE IDs ──────────────────────────────────────────
SET @at_veh = (SELECT id FROM common_catalogs WHERE code = 'AT_VEH');
SET @at_maq = (SELECT id FROM common_catalogs WHERE code = 'AT_MAQ');
SET @at_her = (SELECT id FROM common_catalogs WHERE code = 'AT_HER');

-- ── 2. GEOGRAPHIC NODES: SEDES (MEXICO - PINNED) ─────────────────────────────
INSERT IGNORE INTO common_catalogs (category, code, label) VALUES 
('LOCATION', 'LOC_ASZ', 'Arian Silver Zacatecas');

-- ── 3. OPERATIONAL STRATEGY: USE TYPES ───────────────────────────────────────
INSERT IGNORE INTO common_catalogs (category, code, label) VALUES 
('USE_TYPE', 'USE_SUP',    'Supervisión (Staff)'),
('USE_TYPE', 'USE_TRA_P',  'Transporte de Personal'),
('USE_TYPE', 'USE_CAR_L',  'Carga Ligera (Utilitario)'),
('USE_TYPE', 'USE_CAR_P',  'Carga Pesada (Logística)'),
('USE_TYPE', 'USE_ARR_P',  'Arrastre y Remolque'),
('USE_TYPE', 'USE_OP_EXT', 'Operación Extrema (Campo)'),
('USE_TYPE', 'USE_MINA',   'Operación Mina (Socavón)');

-- ── 4. TIRE & LUBRICANT BRANDS ───────────────────────────────────────────────
INSERT IGNORE INTO common_catalogs (category, code, label) VALUES 
('TIRE_BRAND', 'TB_MICHELIN', 'Michelin'), ('TIRE_BRAND', 'TB_BFG', 'BFGoodrich'),
('LUBE_BRAND', 'LB_ROSHFRANS', 'Roshfrans'), ('LUBE_BRAND', 'LB_MOBIL', 'Mobil'),
('FILTER_BRAND', 'FB_DONALDSON', 'Donaldson'), ('FILTER_BRAND', 'FB_FLEETGUARD','Fleetguard');

-- ── 5. TECHNICAL SPECS ───────────────────────────────────────────────────────
INSERT IGNORE INTO common_catalogs (category, code, label) VALUES 
('ENGINE_TYPE', 'ENG_L4_GAS', 'L4 Gasolina'), ('ENGINE_TYPE', 'ENG_L4_DSL', 'L4 Diésel Turbo'),
('ENGINE_TYPE', 'ENG_DSL_IND', 'Diesel Industrial'), ('ENGINE_TYPE', 'ENG_ELECT', 'Motor Eléctrico');

-- ── 6. BRANDS REGISTRATION (TOTAL SYNC) ─────────────────────────────────────
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', @at_veh, 'B_NISSAN', 'Nissan'), ('BRAND', @at_veh, 'B_TOYOTA', 'Toyota'),
('BRAND', @at_veh, 'B_CHEVROLET', 'Chevrolet'), ('BRAND', @at_veh, 'B_FORD', 'Ford'),
('BRAND', @at_veh, 'B_VW', 'Volkswagen'), ('BRAND', @at_veh, 'B_RAM', 'RAM / Dodge'),
('BRAND', @at_veh, 'B_KIA', 'KIA'), ('BRAND', @at_veh, 'B_HYUNDAI', 'Hyundai'),
('BRAND', @at_veh, 'B_MAZDA', 'Mazda'), ('BRAND', @at_veh, 'B_HONDA', 'Honda'),
('BRAND', @at_veh, 'B_MITSUBISHI', 'Mitsubishi'), ('BRAND', @at_veh, 'B_SUZUKI', 'Suzuki'),
('BRAND', @at_veh, 'B_MG', 'MG'), ('BRAND', @at_veh, 'B_JAC', 'JAC'),
('BRAND', @at_veh, 'B_BYD', 'BYD'), ('BRAND', @at_veh, 'B_CHANGAN', 'Changan'),
('BRAND', @at_veh, 'B_CHIREY', 'Chirey'), ('BRAND', @at_veh, 'B_OMODA', 'Omoda'),
('BRAND', @at_veh, 'B_GWM', 'GWM (Haval)'), ('BRAND', @at_veh, 'B_KW', 'Kenworth'),
('BRAND', @at_veh, 'B_FRTL', 'Freightliner'), ('BRAND', @at_veh, 'B_INTL', 'International'),
('BRAND', @at_veh, 'B_ISUZU', 'Isuzu'), ('BRAND', @at_veh, 'B_HINO', 'Hino'),
('BRAND', @at_veh, 'B_SCANIA', 'Scania'), ('BRAND', @at_veh, 'B_SHACMAN', 'Shacman'),
('BRAND', @at_veh, 'B_SITRAK', 'Sitrak'), ('BRAND', @at_veh, 'B_FOTON', 'Foton');

-- ── 7. MODELS: NISSAN ──────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_NISSAN');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'M1', 'Tsuru'), ('MODEL', @brand_id, 'M2', 'NP300 Chasis'), ('MODEL', @brand_id, 'M3', 'NP300 Estaquitas'),
('MODEL', @brand_id, 'M4', 'Frontier Pro-4X'), ('MODEL', @brand_id, 'M5', 'Versa'), ('MODEL', @brand_id, 'M6', 'March'),
('MODEL', @brand_id, 'M7', 'Tiida'), ('MODEL', @brand_id, 'M8', 'Urvan'), ('MODEL', @brand_id, 'M9', 'Sentra');

-- ── 8. MODELS: TOYOTA ──────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'T1', 'Hilux Gas'), ('MODEL', @brand_id, 'T2', 'Hilux Diesel 4x4'), ('MODEL', @brand_id, 'T3', 'Tacoma'),
('MODEL', @brand_id, 'T4', 'Hiace Panel'), ('MODEL', @brand_id, 'T5', 'Avanza'), ('MODEL', @brand_id, 'T6', 'Corolla'),
('MODEL', @brand_id, 'T7', 'RAV4'), ('MODEL', @brand_id, 'T8', 'Tundra');

-- ── 9. MODELS: CHEVROLET ──────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CHEVROLET');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'C1', 'Chevy (Todas)'), ('MODEL', @brand_id, 'C2', 'Aveo Sedán'), ('MODEL', @brand_id, 'C3', 'S10 Max Chasis'),
('MODEL', @brand_id, 'C4', 'S10 Max Doble Cab'), ('MODEL', @brand_id, 'C5', 'Silverado / Cheyenne'), ('MODEL', @brand_id, 'C6', 'Suburban'),
('MODEL', @brand_id, 'C7', 'Tornado Van'), ('MODEL', @brand_id, 'C8', 'Onix'), ('MODEL', @brand_id, 'C9', 'Captiva Sport');

-- ── 10. MODELS: FORD ──────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_FORD');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'F1', 'F-150'), ('MODEL', @brand_id, 'F2', 'F-350 Super Duty'), ('MODEL', @brand_id, 'F3', 'Ranger XLT/Lariat'),
('MODEL', @brand_id, 'F4', 'Transit Cargo'), ('MODEL', @brand_id, 'F5', 'Explorer'), ('MODEL', @brand_id, 'F6', 'Fiesta Ikon'),
('MODEL', @brand_id, 'F7', 'Lobo Raptor'), ('MODEL', @brand_id, 'F8', 'Maverick');

-- ── 11. MODELS: VW ────────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_VW');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'V1', 'Pointer'), ('MODEL', @brand_id, 'V2', 'Jetta A4 / Clásico'), ('MODEL', @brand_id, 'V3', 'Jetta (NG)'),
('MODEL', @brand_id, 'V4', 'Saveiro'), ('MODEL', @brand_id, 'V5', 'Amarok TDI'), ('MODEL', @brand_id, 'V6', 'Crafter'),
('MODEL', @brand_id, 'V7', 'Transporter T6');

-- ── 12. MODELS: RAM / DODGE ───────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_RAM');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'R1', 'RAM 700'), ('MODEL', @brand_id, 'R2', 'RAM 1500 Mild Hybrid'), ('MODEL', @brand_id, 'R3', 'RAM 4000 Chasis'),
('MODEL', @brand_id, 'R4', 'Promaster Rapid'), ('MODEL', @brand_id, 'R5', 'Atos'), ('MODEL', @brand_id, 'R6', 'Attitude'), ('MODEL', @brand_id, 'R7', 'Dodge H100');

-- ── 13. MODELS: KIA ───────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_KIA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'K1', 'K3 Sedan'), ('MODEL', @brand_id, 'K2', 'Rio Hatchback'), ('MODEL', @brand_id, 'K3', 'Forte'),
('MODEL', @brand_id, 'K4', 'Seltos'), ('MODEL', @brand_id, 'K5', 'Sportage'), ('MODEL', @brand_id, 'K6', 'Sorento');

-- ── 14. MODELS: HYUNDAI ───────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_HYUNDAI');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'H1', 'i10'), ('MODEL', @brand_id, 'H2', 'Creta'), ('MODEL', @brand_id, 'H3', 'Tucson'), ('MODEL', @brand_id, 'H4', 'H100 Carbono');

-- ── 15. MODELS: MAZDA ─────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MAZDA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'Z1', 'Mazda 2'), ('MODEL', @brand_id, 'Z2', 'Mazda 3'), ('MODEL', @brand_id, 'Z3', 'CX-30'), ('MODEL', @brand_id, 'Z4', 'CX-5'), ('MODEL', @brand_id, 'Z5', 'CX-90');

-- ── 16. MODELS: HONDA ─────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_HONDA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'N1', 'City'), ('MODEL', @brand_id, 'N2', 'Civic'), ('MODEL', @brand_id, 'N3', 'HR-V'), ('MODEL', @brand_id, 'N4', 'CR-V'), ('MODEL', @brand_id, 'N5', 'Odyssey');

-- ── 17. MODELS: MITSUBISHI ────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MITSUBISHI');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'B1', 'L200 Legacy'), ('MODEL', @brand_id, 'B2', 'L200 (Nueva Gen)'), ('MODEL', @brand_id, 'B3', 'Montero Sport'), ('MODEL', @brand_id, 'B4', 'Xpander');

-- ── 18. MODELS: SUZUKI ────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_SUZUKI');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'S1', 'Swift'), ('MODEL', @brand_id, 'S2', 'Ignis'), ('MODEL', @brand_id, 'S3', 'Jimny 4x4'), ('MODEL', @brand_id, 'S4', 'Ertiga'), ('MODEL', @brand_id, 'S5', 'Vitara');

-- ── 19. MODELS: MG ─────────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MG');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'G1', 'MG5'), ('MODEL', @brand_id, 'G2', 'GT'), ('MODEL', @brand_id, 'G3', 'ZS'), ('MODEL', @brand_id, 'G4', 'HS'), ('MODEL', @brand_id, 'G5', 'RX5');

-- ── 20. MODELS: JAC ────────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_JAC');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'J1', 'Frison T6'), ('MODEL', @brand_id, 'J2', 'Frison T8'), ('MODEL', @brand_id, 'J3', 'Frison T9 Diesel'), ('MODEL', @brand_id, 'J4', 'Sunray Panel'), ('MODEL', @brand_id, 'J5', 'E10X (EV)');

-- ── 21. MODELS: BYD ─────────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_BYD');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'Y1', 'Shark Pickup'), ('MODEL', @brand_id, 'Y2', 'Dolphin'), ('MODEL', @brand_id, 'Y3', 'Yuan Plus'), ('MODEL', @brand_id, 'Y4', 'Seal');

-- ── 22. MODELS: CHANGAN / CHIREY / OMODA / GWM ───────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CHANGAN');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'U1', 'Alsvin'), ('MODEL', @brand_id, 'U2', 'Hunter Pickup');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_CHIREY');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'U3', 'Tiggo 4 Pro'), ('MODEL', @brand_id, 'U4', 'Tiggo 7 Pro');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_OMODA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'U5', 'C5'), ('MODEL', @brand_id, 'U6', 'O5');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_GWM');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'W1', 'Haval Jolion'), ('MODEL', @brand_id, 'W2', 'Poer Pickup');

-- ── 23. MODELS: KENWORTH ──────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_KW');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'W3', 'T680 Next Gen'), ('MODEL', @brand_id, 'W4', 'T880 Vocacional'), ('MODEL', @brand_id, 'W5', 'T370 Reparto'), ('MODEL', @brand_id, 'W6', 'W900 Classic');

-- ── 24. MODELS: FREIGHTLINER ──────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_FRTL');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'L1', 'Cascadia'), ('MODEL', @brand_id, 'L2', 'M2 Business Class'), ('MODEL', @brand_id, 'L3', 'FL360 (Chato)');

-- ── 25. MODELS: INTERNATIONAL ─────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_INTL');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'I1', 'LT (Line Haul)'), ('MODEL', @brand_id, 'I2', 'HV (Vocacional)'), ('MODEL', @brand_id, 'I3', 'MV (Reparto)');

-- ── 26. MODELS: ISUZU / HINO ──────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_ISUZU');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'S6', 'ELF 100'), ('MODEL', @brand_id, 'S7', 'ELF 600'), ('MODEL', @brand_id, 'S8', 'Forward 1400');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_HINO');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'S9', 'Serie 300'), ('MODEL', @brand_id, 'S10', 'Serie 500');

-- ── 27. MODELS: SCANIA / SHACMAN / SITRAK ────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_SCANIA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'S11', 'Serie R'), ('MODEL', @brand_id, 'S12', 'Serie G (Mixer)');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_SHACMAN');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'S13', 'X3000'), ('MODEL', @brand_id, 'S14', 'X6000');
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_SITRAK');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'S15', 'C7H');

-- ── 28. MODELS: FOTON ─────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_FOTON');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('MODEL', @brand_id, 'S16', 'Aumark'), ('MODEL', @brand_id, 'S17', 'Toano'), ('MODEL', @brand_id, 'S18', 'Tunland');

-- =============================================================================
-- MIGRATION COMPLETE: UNIVERSAL INDUSTRIAL CATALOG v.30.8.0
-- =============================================================================
