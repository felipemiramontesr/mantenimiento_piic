-- 🔱 ARCHON ENGINE CATALOG EVOLUTION (v.2.0)
-- Purifying engine configurations with industrial-grade precision.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. DELETE: Purge generic or outdated engine types
DELETE FROM common_catalogs WHERE category = 'ENGINE_TYPE';

-- 2. SEED: Robust Industrial Engine Archetypes
INSERT INTO common_catalogs (category, code, label) VALUES 
('ENGINE_TYPE', 'ENG_L4_28_DSL', 'L4 2.8L Turbo Intercooled (Diésel)'),
('ENGINE_TYPE', 'ENG_L4_27_GAS', 'L4 2.7L VVT-i DOHC (Gasolina)'),
('ENGINE_TYPE', 'ENG_L4_25_GAS', 'L4 2.5L DOHC Multipunto (Gasolina)'),
('ENGINE_TYPE', 'ENG_V8_64_GAS', 'V8 6.4L HEMI MDS (Gasolina)'),
('ENGINE_TYPE', 'ENG_L4_24_DSL', 'L4 2.4L MIVEC Turbo (Diésel)'),
('ENGINE_TYPE', 'ENG_L4_20_DSL', 'L4 2.0L CTI Turbo (Diésel)'),
('ENGINE_TYPE', 'ENG_L4_14_GAS', 'L4 1.4L TSI Turbo (Gasolina)'),
('ENGINE_TYPE', 'ENG_L4_13_GAS', 'L4 1.3L Firefly (Gasolina)'),
('ENGINE_TYPE', 'ENG_L4_16_GAS', 'L4 1.6L DOHC (Gasolina)'),
('ENGINE_TYPE', 'ENG_L4_15_GAS', 'L4 1.5L DOHC (Gasolina)'),
('ENGINE_TYPE', 'ENG_L6_67_DSL', 'L6 6.7L Cummins Turbo (Diésel)'),
('ENGINE_TYPE', 'ENG_BEV_DUAL',  'Electric Dual-Motor (BEV)'),
('ENGINE_TYPE', 'ENG_L4_25_DSL', 'L4 2.5L Turbo (2KD-FTV Diésel)');

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- MIGRATION COMPLETE: Robust Engine Catalog v.39.9.13
-- =============================================================================
