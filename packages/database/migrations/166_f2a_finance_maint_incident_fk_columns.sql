-- Migration 166: FC 082 F2a — ALTER FK aditivo + backfill (sin DROP ENUM)
-- Alcance: dictamen O Alfa (15:40) + auditoría R Bravo (15:45) sobre el
-- cierre de F1 E3. Token Driver Charlie para diseñar F2.
--
-- DECISIÓN DE DISEÑO (Cláusula L, Fase 2 re-leída): el scope original del
-- FC agrupa "Backfill + DROP ENUMs" en una sola Fase 2. Verificado el
-- terreno real de código antes de escribir nada: las 4 columnas ENUM
-- tocadas aquí las consumen 6 archivos de rutas API (finance.ts, fleet.ts,
-- alerts.ts, fleetMaintenance.ts, reports.ts, fleetRoutes.ts) — un DROP
-- directo del ENUM rompería esas rutas si no va acompañado del cutover de
-- código en el MISMO despliegue (mismo principio R6 que F0: código antes
-- que DB). Se parte F2 en dos, mismo patrón que F0a/b/c:
--   F2a (ESTA migración) — 100% aditiva: columnas FK nullable + backfill +
--        verificación Inv-A. El ENUM sigue siendo la fuente de verdad; cero
--        riesgo para el código actual (no lee las columnas nuevas todavía).
--   F2b (pendiente, requiere tocar los 6 archivos) — cutover de código a
--        las columnas FK + DROP de los ENUMs, en ventana propia.
--
-- Backfill probado con lógica de mapeo aislada contra tabla temporal local
-- (22/22 valores ENUM → catalog_id correctos, 0 sin mapear) — ver F en
-- entrada de esta fase. Prod tiene 0 filas en las 3 tablas operativas
-- (confirmado por el Job Summary de la 165) por lo que el UPDATE de
-- backfill es un no-op seguro hoy; se escribe completo y correcto para
-- cuando existan filas reales.
--
-- Idempotente (§23.2): ADD COLUMN/INDEX IF NOT EXISTS · FK vía verificación
-- información_schema (patrón migración 159, MariaDB no soporta
-- ADD CONSTRAINT IF NOT EXISTS para FK).
--
-- Incluye además (Cond.3, aprobado O+R): DROP de suite_catalog_mappings —
-- metadata estática del eje suite (migración 125, 28 VIM+28 ERP),
-- identificada con evidencia en 085_AN §2c, sin código vivo ni FK entrantes.

SET NAMES utf8mb4;

-- ═══ (1) financial_transactions.category / .source ══════════════════════════
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS category_id INT NULL AFTER category,
  ADD COLUMN IF NOT EXISTS source_id   INT NULL AFTER source;

ALTER TABLE financial_transactions
  ADD INDEX IF NOT EXISTS idx_ft_category_id (category_id),
  ADD INDEX IF NOT EXISTS idx_ft_source_id (source_id);

SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'financial_transactions'
    AND CONSTRAINT_NAME = 'fk_ft_category' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk = 0,
  'ALTER TABLE financial_transactions ADD CONSTRAINT fk_ft_category FOREIGN KEY (category_id) REFERENCES common_catalogs(id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'financial_transactions'
    AND CONSTRAINT_NAME = 'fk_ft_source' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk = 0,
  'ALTER TABLE financial_transactions ADD CONSTRAINT fk_ft_source FOREIGN KEY (source_id) REFERENCES common_catalogs(id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE financial_transactions ft
JOIN common_catalogs cc ON cc.category = 'FINANCE_CATEGORY' AND cc.code = ft.category
SET ft.category_id = cc.id
WHERE ft.category_id IS NULL;

UPDATE financial_transactions ft
JOIN common_catalogs cc ON cc.category = 'FINANCE_SOURCE' AND cc.code = ft.source
SET ft.source_id = cc.id
WHERE ft.source_id IS NULL;

-- ═══ (2) fleet_maintenance_extensions.service_type / .system_recommended_type
ALTER TABLE fleet_maintenance_extensions
  ADD COLUMN IF NOT EXISTS service_type_id INT NULL AFTER service_type,
  ADD COLUMN IF NOT EXISTS system_recommended_type_id INT NULL AFTER system_recommended_type;

ALTER TABLE fleet_maintenance_extensions
  ADD INDEX IF NOT EXISTS idx_fme_service_type_id (service_type_id),
  ADD INDEX IF NOT EXISTS idx_fme_system_rec_type_id (system_recommended_type_id);

SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fleet_maintenance_extensions'
    AND CONSTRAINT_NAME = 'fk_fme_service_type' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk = 0,
  'ALTER TABLE fleet_maintenance_extensions ADD CONSTRAINT fk_fme_service_type FOREIGN KEY (service_type_id) REFERENCES common_catalogs(id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fleet_maintenance_extensions'
    AND CONSTRAINT_NAME = 'fk_fme_system_rec_type' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk = 0,
  'ALTER TABLE fleet_maintenance_extensions ADD CONSTRAINT fk_fme_system_rec_type FOREIGN KEY (system_recommended_type_id) REFERENCES common_catalogs(id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fleet_maintenance_extensions usa COLLATE utf8mb4_general_ci (distinto del
-- resto del esquema, utf8mb4_unicode_ci) — COLLATE explícito para evitar
-- ERROR 1267 "Illegal mix of collations" (mismo patrón que migración 134).
UPDATE fleet_maintenance_extensions fme
JOIN common_catalogs cc
  ON cc.category = 'MAINT_SERVICE_TYPE'
  AND cc.code = CONVERT(fme.service_type USING utf8mb4) COLLATE utf8mb4_unicode_ci
SET fme.service_type_id = cc.id
WHERE fme.service_type_id IS NULL;

UPDATE fleet_maintenance_extensions fme
JOIN common_catalogs cc
  ON cc.category = 'MAINT_SERVICE_TYPE'
  AND cc.code = CONVERT(fme.system_recommended_type USING utf8mb4) COLLATE utf8mb4_unicode_ci
SET fme.system_recommended_type_id = cc.id
WHERE fme.system_recommended_type_id IS NULL AND fme.system_recommended_type IS NOT NULL;

-- ═══ (3) fleet_maintenance_logs.service_type ═════════════════════════════════
ALTER TABLE fleet_maintenance_logs
  ADD COLUMN IF NOT EXISTS service_type_id INT NULL AFTER service_type;

ALTER TABLE fleet_maintenance_logs
  ADD INDEX IF NOT EXISTS idx_fml_service_type_id (service_type_id);

SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fleet_maintenance_logs'
    AND CONSTRAINT_NAME = 'fk_fml_service_type' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk = 0,
  'ALTER TABLE fleet_maintenance_logs ADD CONSTRAINT fk_fml_service_type FOREIGN KEY (service_type_id) REFERENCES common_catalogs(id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE fleet_maintenance_logs fml
JOIN common_catalogs cc ON cc.category = 'MAINT_SERVICE_TYPE' AND cc.code = fml.service_type
SET fml.service_type_id = cc.id
WHERE fml.service_type_id IS NULL;

-- ═══ (4) route_incidents.category ════════════════════════════════════════════
ALTER TABLE route_incidents
  ADD COLUMN IF NOT EXISTS category_id INT NULL AFTER category;

ALTER TABLE route_incidents
  ADD INDEX IF NOT EXISTS idx_ri_category_id (category_id);

SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'route_incidents'
    AND CONSTRAINT_NAME = 'fk_ri_category' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk = 0,
  'ALTER TABLE route_incidents ADD CONSTRAINT fk_ri_category FOREIGN KEY (category_id) REFERENCES common_catalogs(id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE route_incidents ri
JOIN common_catalogs cc ON cc.category = 'INCIDENT_CATEGORY' AND cc.code = ri.category
SET ri.category_id = cc.id
WHERE ri.category_id IS NULL;

-- ═══ (5) Cond.3 (O+R aprobado) — DROP suite_catalog_mappings ═════════════════
-- Metadata estática del eje suite (migración 125, 28 VIM+28 ERP), 0 código
-- vivo, 0 FK entrantes, sin PII — identificada con evidencia en 085_AN §2c.
DROP TABLE IF EXISTS suite_catalog_mappings;

-- ═══ Verificación Inv-A (FC 082: "∀ columna ENUM del censo F1: ∃ catálogo+FK
--     ∧ conteos 1:1 post-backfill") — pending_* debe ser 0 en las 4 columnas.
SELECT 'pending_ft_category' k,
  (SELECT COUNT(*) FROM financial_transactions WHERE category_id IS NULL) v
UNION SELECT 'pending_ft_source',
  (SELECT COUNT(*) FROM financial_transactions WHERE source_id IS NULL)
UNION SELECT 'pending_fme_service_type',
  (SELECT COUNT(*) FROM fleet_maintenance_extensions WHERE service_type_id IS NULL)
UNION SELECT 'pending_fme_system_rec_type',
  (SELECT COUNT(*) FROM fleet_maintenance_extensions WHERE system_recommended_type_id IS NULL AND system_recommended_type IS NOT NULL)
UNION SELECT 'pending_fml_service_type',
  (SELECT COUNT(*) FROM fleet_maintenance_logs WHERE service_type_id IS NULL)
UNION SELECT 'pending_ri_category',
  (SELECT COUNT(*) FROM route_incidents WHERE category_id IS NULL)
UNION SELECT 'suite_catalog_mappings_dropped',
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='suite_catalog_mappings');
-- Esperado: todo 0 (backfill 100% completo, tabla dropeada). ENUMs originales
-- SIN TOCAR — siguen siendo la fuente de verdad hasta el cutover de código
-- de F2b. Sin ALTER a NOT NULL, sin DROP de ENUM: eso es F2b.
