-- 🔱 Archon Alpha v.39.3.1 - "Sovereign Catalog Sanitization"
-- Logic: Remapping legacy IDs to new tactical intervals and cleaning duplicates.
-- Purpose: Ensuring data integrity and perfect UI sorting.

-- ── 1. REMAPEO DE UNIDADES EXISTENTES ──────────────────────────────────
-- Antes de borrar los duplicados, movemos cualquier unidad que los use a los nuevos IDs.
-- ID 13 (15k KM) -> ID 950
-- ID 14 (250 HRS) -> ID 972
-- ID 15 (500 HRS) -> ID 977
-- ID 16 (1000 HRS) -> ID 987
UPDATE fleet_units SET maintenance_usage_freq_id = 950 WHERE maintenance_usage_freq_id = 13;
UPDATE fleet_units SET maintenance_usage_freq_id = 972 WHERE maintenance_usage_freq_id = 14;
UPDATE fleet_units SET maintenance_usage_freq_id = 977 WHERE maintenance_usage_freq_id = 15;
UPDATE fleet_units SET maintenance_usage_freq_id = 987 WHERE maintenance_usage_freq_id = 16;

-- ── 2. ELIMINACIÓN DE DUPLICADOS ANTIGUOS ───────────────────────────────
-- Borramos los registros de FREQ_USAGE con IDs bajos para quedarnos solo con la serie 900.
DELETE FROM common_catalogs WHERE category = 'FREQ_USAGE' AND id IN (13, 14, 15, 16);

-- ── 3. ESTANDARIZACIÓN DE FREQ_TIME (ORDEN CRONOLÓGICO) ────────────────
-- Aseguramos que el numeric_value sea el peso en días para un orden perfecto.
UPDATE common_catalogs SET numeric_value = 1.00, unit = 'days' WHERE code = 'T_DIARIA';
UPDATE common_catalogs SET numeric_value = 7.00, unit = 'days' WHERE code = 'T_SEMANAL';
UPDATE common_catalogs SET numeric_value = 30.00, unit = 'days' WHERE code = 'T_MENSUAL';
UPDATE common_catalogs SET numeric_value = 60.00, unit = 'days' WHERE code = 'T_BIMEST';
UPDATE common_catalogs SET numeric_value = 90.00, unit = 'days' WHERE code = 'T_TRIMEST';
UPDATE common_catalogs SET numeric_value = 180.00, unit = 'days' WHERE code = 'T_SEMEST';

-- Añadimos 'Anual' si no existe.
INSERT IGNORE INTO common_catalogs (category, code, label, numeric_value, unit) 
VALUES ('FREQ_TIME', 'T_ANUAL', 'Anual', 365.00, 'days');

-- ── 4. LIMPIEZA DE CATEGORÍA ERRÓNEA ───────────────────────────────────
-- En el dump veo 'MAINT_FREQ_USAGE' (IDs 42, 43). 
-- Para mantener soberanía, todo debe vivir en 'FREQ_USAGE'.
DELETE FROM common_catalogs WHERE category = 'MAINT_FREQ_USAGE';
