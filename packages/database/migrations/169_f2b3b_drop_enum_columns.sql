-- Migration 169 (v2): FC 082 F2b3b — DROP definitivo de las 6 columnas ENUM
-- reemplazadas por su equivalente *_id (FK a common_catalogs) a lo largo
-- de F2a/F2b1/F2b2/F2b3a. Último paso de la normalización ENUM→catálogos.
--
-- v2 — REESCRITA tras auditoría R de Bravo (NO CONFORME sobre v1, 2026-07-24
-- 12:22:02) confirmando reserva arquitectónica de Alfa (12:15:57). v1 solo
-- DROPeaba las columnas sin atender dos dependencias reales de esquema:
--   (1) view_fleet_units_tco y view_fleet_model_failure_patterns (ambas
--       re-creadas por la migración 164 en F0c) proyectan ft.category /
--       ri.category directo en CASE/WHERE/GROUP BY. Un DROP sin redefinirlas
--       primero las deja inválidas — MySQL Error 1356 — rompiendo TCO, VIM
--       (fleet failure patterns), Inteligencia de Flotas y /v1/recalls-vim.
--       CONFIRMADO EN TERRENO: v1 corrida 2x contra local ya rompió
--       view_fleet_units_tco con ese error exacto antes de escribir v2.
--   (2) idx_cat_period (category, period) se degradaba a (period) por
--       reducción automática de MySQL/MariaDB al dropear category — Bravo
--       exige el swap explícito a idx_ft_category_id_period (category_id,
--       period) en vez de dejarlo a la reducción automática.
-- Barrido de las 8 vistas del schema (information_schema.VIEWS, local)
-- confirma que estas 2 son las ÚNICAS con dependencia — owners,
-- owner_profiles, owner_service_links, user_owner_membership,
-- view_fleet_fuel_efficiency y view_fleet_oee_factors están limpias.
--
-- ORDEN OBLIGATORIO (Bravo, Cond.1 de la re-auditoría):
--   1. Redefinir ambas vistas vía category_id + JOIN common_catalogs.
--   2. DROP idx_cat_period + CREATE idx_ft_category_id_period explícito.
--   3. DROP de las 6 columnas ENUM.
--   4. Verificación: SHOW COLUMNS + pending_*=0 + SELECT smoke de ambas
--      vistas post-DROP (confirma que siguen siendo consultables).
--
-- PRERREQUISITOS (sin cambios respecto a v1, re-verificados antes de
-- reescribir): F2b3a write-cutover CERRADA EN FIRME (O✓ Alfa + R✓ Bravo,
-- commits b5adbf05/06581802/ad5dc680) · F2b3b Paso 1/2 read-cutover
-- (commit a4c601b7) confirmado desplegado en PROD por Ω vía dashboard
-- Hostinger · re-grep completo apps/api/src: cero referencias a las 6
-- columnas ENUM, lectura ni escritura · backfill 100% (pending_*=0).
--
-- IDEMPOTENCIA: `DROP COLUMN IF EXISTS` / `DROP INDEX` con verificación
-- previa vía information_schema.STATISTICS (esta sí funciona en este
-- hosting — el hallazgo de 168 fue específico a information_schema.COLUMNS,
-- no a information_schema en general) / `CREATE OR REPLACE VIEW` (siempre
-- idempotente por diseño, no requiere IF NOT EXISTS).
--
-- Cero cambio de dominio de negocio: los datos ya viven en category_id/
-- source_id/service_type_id/system_recommended_type_id desde el backfill
-- de F2a y el write-cutover de F2b1/F2b3a.

SET NAMES utf8mb4;

-- ═══ (1) Redefinir vistas dependientes ANTES de tocar columnas/índices ═══

DROP VIEW IF EXISTS view_fleet_units_tco;
CREATE VIEW view_fleet_units_tco AS
SELECT
  fu.id                                                                                  AS fleet_unit_id,
  fu.ownerId                                                                             AS owner_id,
  COALESCE(SUM(ft.amount), 0.00)                                                        AS tco_total,
  COALESCE(SUM(CASE WHEN cc.code = 'MAINTENANCE'  THEN ft.amount ELSE 0 END), 0.00)      AS tco_maintenance,
  COALESCE(SUM(CASE WHEN cc.code = 'INSURANCE'    THEN ft.amount ELSE 0 END), 0.00)      AS tco_insurance,
  COALESCE(SUM(CASE WHEN cc.code = 'LEASE'        THEN ft.amount ELSE 0 END), 0.00)      AS tco_lease,
  COALESCE(SUM(CASE WHEN cc.code = 'TENENCIA'     THEN ft.amount ELSE 0 END), 0.00)      AS tco_tenencia,
  COALESCE(SUM(CASE WHEN cc.code = 'VERIFICACION' THEN ft.amount ELSE 0 END), 0.00)      AS tco_verificacion,
  COALESCE(SUM(CASE WHEN cc.code = 'FUEL'         THEN ft.amount ELSE 0 END), 0.00)      AS tco_fuel,
  COALESCE(SUM(CASE WHEN cc.code = 'OTHER'        THEN ft.amount ELSE 0 END), 0.00)      AS tco_other,
  COUNT(ft.id)                                                                           AS total_records,
  MAX(ft.created_at)                                                                     AS last_record_at
FROM fleet_units fu
JOIN tenants o ON fu.ownerId = o.id
LEFT JOIN financial_transactions ft ON ft.unit_id = fu.id
LEFT JOIN common_catalogs cc ON cc.id = ft.category_id
GROUP BY fu.id, fu.ownerId;

DROP VIEW IF EXISTS view_fleet_model_failure_patterns;
CREATE VIEW view_fleet_model_failure_patterns AS
SELECT
  p.brand_id, p.model_id, p.make, p.model, p.year, p.failure_category,
  p.occurrence_count, p.affected_units, p.avg_km_at_failure, p.km_std_dev,
  p.avg_cost_mxn, p.first_seen_at,
  ROUND(p.affected_units / ut.total_units, 4) AS confidence_score
FROM (
  SELECT
    fu.brandId AS brand_id, fu.modelId AS model_id, cb.label AS make, cm.label AS model,
    fu.year, cc_ft.code AS failure_category, COUNT(ft.id) AS occurrence_count,
    COUNT(DISTINCT fu.id) AS affected_units, ROUND(AVG(fu.odometer), 0) AS avg_km_at_failure,
    ROUND(STDDEV(fu.odometer), 0) AS km_std_dev, ROUND(AVG(ft.amount), 2) AS avg_cost_mxn,
    MIN(ft.period) AS first_seen_at
  FROM financial_transactions ft
  JOIN fleet_units fu ON ft.unit_id = fu.id
  JOIN tenants o ON fu.ownerId = o.id
  LEFT JOIN common_catalogs cb ON fu.brandId = cb.id AND cb.category = 'BRAND'
  LEFT JOIN common_catalogs cm ON fu.modelId = cm.id AND cm.category = 'MODEL'
  LEFT JOIN common_catalogs cc_ft ON cc_ft.id = ft.category_id
  WHERE cc_ft.code IN ('MAINTENANCE', 'REPAIR')
  GROUP BY fu.brandId, fu.modelId, fu.year, cc_ft.code, cb.label, cm.label

  UNION ALL

  SELECT
    fu.brandId, fu.modelId, cb.label, cm.label, fu.year, cc_ri.code,
    COUNT(ri.id), COUNT(DISTINCT fu.id), ROUND(AVG(fm.start_reading), 0),
    ROUND(STDDEV(fm.start_reading), 0), NULL, DATE(MIN(fm.start_at))
  FROM route_incidents ri
  JOIN fleet_movements fm ON ri.route_uuid = fm.uuid
  JOIN fleet_units fu ON fm.unit_id = fu.id
  JOIN tenants o ON fu.ownerId = o.id
  LEFT JOIN common_catalogs cb ON fu.brandId = cb.id AND cb.category = 'BRAND'
  LEFT JOIN common_catalogs cm ON fu.modelId = cm.id AND cm.category = 'MODEL'
  LEFT JOIN common_catalogs cc_ri ON cc_ri.id = ri.category_id
  GROUP BY fu.brandId, fu.modelId, fu.year, cc_ri.code, cb.label, cm.label
) p
JOIN (
  SELECT brandId, modelId, year, COUNT(*) AS total_units
  FROM fleet_units
  GROUP BY brandId, modelId, year
) ut ON p.brand_id = ut.brandId AND p.model_id = ut.modelId AND p.year = ut.year;

-- ═══ (2) Índice: swap explícito, no depender de la reducción automática ═══
-- Idempotente: DROP INDEX solo si existe (information_schema.STATISTICS,
-- confirmado funcional en este hosting -- distinto de information_schema.
-- COLUMNS, que sí falla aquí per el hallazgo de terreno de la migración 168).
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'financial_transactions'
    AND INDEX_NAME = 'idx_cat_period'
);
SET @drop_idx_sql = IF(@idx_exists > 0, 'DROP INDEX idx_cat_period ON financial_transactions', 'SELECT 1');
PREPARE stmt FROM @drop_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @newidx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'financial_transactions'
    AND INDEX_NAME = 'idx_ft_category_id_period'
);
SET @create_idx_sql = IF(
  @newidx_exists = 0,
  'CREATE INDEX idx_ft_category_id_period ON financial_transactions (category_id, period)',
  'SELECT 1'
);
PREPARE stmt FROM @create_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ═══ (3) DROP definitivo de las 6 columnas ENUM ═══════════════════════════
ALTER TABLE financial_transactions
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS source;

ALTER TABLE fleet_maintenance_extensions
  DROP COLUMN IF EXISTS service_type,
  DROP COLUMN IF EXISTS system_recommended_type;

ALTER TABLE fleet_maintenance_logs
  DROP COLUMN IF EXISTS service_type;

ALTER TABLE route_incidents
  DROP COLUMN IF EXISTS category;

-- ═══ (4) Verificación ═════════════════════════════════════════════════════
-- SHOW COLUMNS en vez de information_schema.COLUMNS (mismo motivo que 168).
-- Esperado: las 4 consultas devuelven CERO filas (columna inexistente).
SHOW COLUMNS FROM financial_transactions WHERE Field IN ('category','source');
SHOW COLUMNS FROM fleet_maintenance_extensions WHERE Field IN ('service_type','system_recommended_type');
SHOW COLUMNS FROM fleet_maintenance_logs WHERE Field = 'service_type';
SHOW COLUMNS FROM route_incidents WHERE Field = 'category';

-- Índice nuevo presente, viejo ausente.
SHOW INDEX FROM financial_transactions WHERE Key_name IN ('idx_cat_period','idx_ft_category_id_period');

-- Backfill 100% -- cero huérfanos de *_id.
SELECT 'pending_ft_category_id' k, COUNT(*) v FROM financial_transactions WHERE category_id IS NULL
UNION SELECT 'pending_ft_source_id', COUNT(*) FROM financial_transactions WHERE source_id IS NULL
UNION SELECT 'pending_fme_service_type_id', COUNT(*) FROM fleet_maintenance_extensions WHERE service_type_id IS NULL
UNION SELECT 'pending_fml_service_type_id', COUNT(*) FROM fleet_maintenance_logs WHERE service_type_id IS NULL
UNION SELECT 'pending_ri_category_id', COUNT(*) FROM route_incidents WHERE category_id IS NULL;

-- Smoke test -- ambas vistas siguen siendo consultables post-DROP (Cond.1
-- Bravo, punto 4). Un error aquí es HALT inmediato -- no debería ocurrir
-- porque las vistas ya se redefinieron sin referencia al ENUM en el paso 1.
SELECT 'smoke_view_fleet_units_tco' k, COUNT(*) v FROM view_fleet_units_tco
UNION SELECT 'smoke_view_fleet_model_failure_patterns', COUNT(*) FROM view_fleet_model_failure_patterns;
