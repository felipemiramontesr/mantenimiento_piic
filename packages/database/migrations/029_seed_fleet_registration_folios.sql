-- =============================================================================
-- 🔱 ARCHON COMMAND CENTER - FLEET COMPLIANCE SEEDER (v.1.0.0)
-- Script: 029_seed_fleet_registration_folios.sql
-- Description: Injection of Zacatecas Registration Folios (Tarjeta de Circulación).
-- Domain: Fleet Compliance & Asset Identity
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. INYECCIÓN DE FOLIOS TÉCNICOS (Formato Zacatecas ZAC-XXXXXXXX)
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882102' WHERE id = 'ASM-002';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882106' WHERE id = 'ASM-006';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882107' WHERE id = 'ASM-007';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882108' WHERE id = 'ASM-008';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882109' WHERE id = 'ASM-009';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882110' WHERE id = 'ASM-010';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882111' WHERE id = 'ASM-011';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882112' WHERE id = 'ASM-012';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882113' WHERE id = 'ASM-013';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882114' WHERE id = 'ASM-014';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882115' WHERE id = 'ASM-015';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882116' WHERE id = 'ASM-016';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882117' WHERE id = 'ASM-017';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882118' WHERE id = 'ASM-018';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882119' WHERE id = 'ASM-019';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882120' WHERE id = 'ASM-020';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882121' WHERE id = 'ASM-021';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882122' WHERE id = 'ASM-022';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882123' WHERE id = 'ASM-023';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882124' WHERE id = 'ASM-024';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882125' WHERE id = 'ASM-025';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882126' WHERE id = 'ASM-026';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882127' WHERE id = 'ASM-027';
UPDATE fleet_units SET tarjeta_circulacion = 'ZAC-05882999' WHERE id = 'ASM-PROV';

SET FOREIGN_KEY_CHECKS = 1;

-- 2. VERIFICACIÓN FINAL
-- SELECT id, tag, tarjeta_circulacion FROM fleet_units WHERE tarjeta_circulacion IS NOT NULL;
