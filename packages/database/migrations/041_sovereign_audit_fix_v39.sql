-- 🔱 Archon Alpha v.39.1.5 - "Sovereign Audit Fix & Data Integrity"
-- Logic: Correcting cross-linked records and orphan IDs in fleet_units.
-- Purpose: Ensuring that real fleet assets (Seat, JAC, RAM) are linked to their correct master catalog entries.

-- ── 1. INFRAESTRUCTURA FALTANTE ──────────────────────────────────────────
-- Crear marca SEAT y modelos específicos para corregir la flota real.

INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES ('BRAND', 1, 'B_SEAT', 'Seat');

-- Recuperar ID de Seat para los modelos
SET @seat_id = (SELECT id FROM common_catalogs WHERE code = 'B_SEAT' LIMIT 1);

INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @seat_id, 'M_SEA_ATE', 'Ateca'),
('MODEL', 256, 'M_JAC_X200', 'X200 (Camión Ligero)');

-- ── 2. CORRECCIÓN DE DATA INTEGRITY (fleet_units) ───────────────────────
-- Reparación de unidades reales con vínculos incorrectos o huérfanos.

-- Corregir ASM-023 (Seat Ateca): Estaba vinculado a Omoda O5 (ID 666)
UPDATE fleet_units 
SET brand_id = @seat_id, 
    model_id = (SELECT id FROM common_catalogs WHERE code = 'M_SEA_ATE' LIMIT 1) 
WHERE id = 'ASM-023';

-- Corregir ASM-025 (JAC X200): Estaba vinculado a Omoda O5 (ID 666)
UPDATE fleet_units 
SET model_id = (SELECT id FROM common_catalogs WHERE code = 'M_JAC_X200' LIMIT 1) 
WHERE id = 'ASM-025';

-- Corregir ASM-024 (JAC Frison): Tenía un ID huérfano (364)
UPDATE fleet_units SET model_id = 654 WHERE id = 'ASM-024';

-- Corregir RAM 700 y 4000: Movimiento de modelos viejos (121, 128) a Maestros (555, 557)
UPDATE fleet_units SET model_id = 555 WHERE model_id = 121;
UPDATE fleet_units SET model_id = 557 WHERE model_id = 128;

-- ── 3. PURGA FINAL DE DUPLICADOS Y BASURA ────────────────────────────────
-- Eliminación de registros detectados en la auditoría v39.1.5.

-- Eliminar Toyota redundantes que sobrevivieron
DELETE FROM common_catalogs WHERE id IN (25, 26, 27);

-- Eliminar modelos con códigos genéricos "Basura"
DELETE FROM common_catalogs WHERE id BETWEEN 454 AND 461; -- CAT1, CAT2...
DELETE FROM common_catalogs WHERE id BETWEEN 462 AND 470; -- MW1, MW2...
DELETE FROM common_catalogs WHERE code IN ('CAT1', 'CAT2', 'CAT3', 'CAT4', 'MW1', 'MW2', 'MW3');

-- Eliminar duplicados residuales de Mazda, BYD y Fluke
DELETE FROM common_catalogs WHERE id IN (745, 748, 749, 762);

-- ── 4. SANEAMIENTO DE CÓDIGOS DE MODELO ─────────────────────────────────
-- Asegurar que todos los modelos tengan el parent_id correcto (Brand)
UPDATE common_catalogs SET parent_id = 38 WHERE id = 591; -- BT-50 a Mazda
UPDATE common_catalogs SET parent_id = 35 WHERE id = 572; -- L200 a Mitsubishi
