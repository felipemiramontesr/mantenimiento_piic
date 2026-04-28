-- 🔱 ARCHON DATABASE NORMALIZATION v.2.0
-- Propósito: Migrar de frecuencias basadas en catálogos a intervalos numéricos exactos (Días/KM).

SET FOREIGN_KEY_CHECKS = 0;

-- 1. ESTRUCTURA: Asegurar columnas de intervalo técnico
ALTER TABLE fleet_units MODIFY COLUMN maint_interval_days INT DEFAULT 0;
ALTER TABLE fleet_units MODIFY COLUMN maint_interval_km DECIMAL(12,2) DEFAULT 0.00;

-- 2. MIGRACIÓN: Purificar datos desde catálogos a valores numéricos
-- Sincronizamos maint_interval_days basado en el catálogo de tiempo
UPDATE fleet_units f
JOIN common_catalogs ct ON f.maintenance_time_freq_id = ct.id
SET f.maint_interval_days = CAST(COALESCE(ct.numeric_value, 0) AS UNSIGNED)
WHERE ct.category = 'MAINTENANCE_TIME_FREQ';

-- Sincronizamos maint_interval_km basado en el catálogo de uso
UPDATE fleet_units f
JOIN common_catalogs cu ON f.maintenance_usage_freq_id = cu.id
SET f.maint_interval_km = COALESCE(cu.numeric_value, 0.00)
WHERE cu.category = 'MAINTENANCE_USAGE_FREQ';

-- 3. VALORES POR DEFECTO: Evitar ceros en registros activos si no tenían catálogo
UPDATE fleet_units SET maint_interval_days = 90 WHERE maint_interval_days = 0;
UPDATE fleet_units SET maint_interval_km = 5000 WHERE maint_interval_km = 0;

SET FOREIGN_KEY_CHECKS = 1;
