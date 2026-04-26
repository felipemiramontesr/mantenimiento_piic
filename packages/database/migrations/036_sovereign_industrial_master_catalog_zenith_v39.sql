-- 🔱 Archon Alpha v.39.0.7 - "Sovereign Industrial Master Catalog: Zenith Tier"
-- Logic: The Final Frontier of Asset Intelligence for World-Class Mining & Metallurgy.
-- Architecture: Comprehensive Industrial Ecosystem Integration.
-- Purpose: Closing the gap on Fixed Plant, Specialized Underground, and Lab Instrumentation.

-- ── 1. MARCAS DE PLANTA FIJA & PROCESAMIENTO (Fixed Plant) ────────────────

INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 2, 'B_FLSMIDTH',  'FLSmidth (Molienda/Procesos)'),
('BRAND', 2, 'B_WARMAN',    'Warman / Weir Group (Bombas Slurry)'),
('BRAND', 2, 'B_CONTINENT', 'Continental (Bandas/Sistemas)'),
('BRAND', 2, 'B_ABB',       'ABB (Potencia y Automatización)'),
('BRAND', 2, 'B_SIEMENS',   'Siemens (Industrial)'),
('BRAND', 2, 'B_SULZER',    'Sulzer (Bombas Industriales)');

-- ── 2. VEHÍCULOS ESPECIALIZADOS DE SOCAVÓN (Underground Support) ──────────

INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 2, 'B_NORMET',    'Normet (Lanzado/Anclaje/Explosivos)'),
('BRAND', 2, 'B_GETMAN',    'Getman (Logística Socavón)'),
('BRAND', 2, 'B_MINECAT',   'Minecat (Transporte Personal)');

-- ── 3. INSTRUMENTACIÓN DE LABORATORIO & PRECISIÓN ─────────────────────────

INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 3, 'B_THERMO',    'Thermo Scientific (Lab/XRF)'),
('BRAND', 3, 'B_AGILENT',   'Agilent Technologies'),
('BRAND', 3, 'B_PANALYT',   'Malvern PANalytical');

-- ── 4. JERARQUÍA ZENITH: MODELOS DE ALTO IMPACTO ──────────────────────────

-- FLSMIDTH (Plant)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_FLSMIDTH');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'FLS_SAG',    'Molino SAG (Semi-Autógeno)'),
('MODEL', @brand_id, 'FLS_BALL',   'Molino de Bolas (Ball Mill)'),
('MODEL', @brand_id, 'FLS_CRUSH',  'Chancadora Giratoria');

-- WARMAN (Pumps)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_WARMAN');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'WAR_AH',     'Bomba de Lodos Serie AH'),
('MODEL', @brand_id, 'WAR_MC',     'Bomba de Alimentación a Molinos');

-- NORMET (Specialized)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_NORMET');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'NOR_SPRAY',  'Spraymec (Lanzador de Concreto)'),
('MODEL', @brand_id, 'NOR_CHARG',  'Charmec (Cargador de Explosivos)'),
('MODEL', @brand_id, 'NOR_BOLT',   'Utilift (Plataforma de Tijera)');

-- THERMO SCIENTIFIC (Lab)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_THERMO');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'THE_NITON',  'Analizador XRF Portátil Niton'),
('MODEL', @brand_id, 'THE_ICP',    'Espectrómetro ICP-OES');

-- ABB / SIEMENS (Electrical)
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_ABB');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'ABB_VFD',    'Variador de Frecuencia ACS880'),
('MODEL', @brand_id, 'ABB_TRANS',  'Transformador Seco Trihal');

-- ── 5. REPARACIÓN DE JERARQUÍA ADICIONAL (Final Polish) ────────────────────
-- Asegurar que marcas de Herramienta Menor como Makita/Bosch tengan cobertura de modelos robusta
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MAKITA');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'MAK_GA',     'Esmeriladora Angular GA7020'),
('MODEL', @brand_id, 'MAK_HR',     'Rotomartillo SDS-Plus HR2470');

SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_BOSCH');
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'B_BOS_GWS_7',  'Esmeriladora GWS 7-115'),
('MODEL', @brand_id, 'B_BOS_GBH_8',  'Martillo Combinado GBH 8-45 DV');
