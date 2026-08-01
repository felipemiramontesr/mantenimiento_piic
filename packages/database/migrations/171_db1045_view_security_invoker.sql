-- Migration 171: Incidente DB-1045 — SQL SECURITY INVOKER en las 4 vistas
-- con DEFINER de host no coincidente (clase R1, ya vista en FC082 F0/V.587).
--
-- Causa raíz confirmada (matriz Cond.4 de Bravo, 10/10 fallo secuencial +
-- 10/10 concurrente aislado en GET /v1/fleet, sin ninguna concurrencia):
-- `owners` (y otras 3 vistas) tienen SQL SECURITY DEFINER fijado al host de
-- quien ejecutó el CREATE VIEW en su momento (una sesión de phpMyAdmin o el
-- runner self-hosted de GitHub Actions), no al host desde el que conecta la
-- app real en Hostinger (127.0.0.1). MySQL evalúa el contexto del DEFINER al
-- ejecutar la vista y responde "Access denied for user 'X'@'127.0.0.1'"
-- (1045) — el mismo código de error documentado en FC082 F0 ("cadena de
-- definers phpMyAdmin-era"), que se creía resuelto pero nunca tocó `owners`.
--
-- Barrido completo de information_schema.VIEWS confirmó 4 vistas afectadas
-- (DEFINER != app@127.0.0.1) de las 8 totales del esquema:
--   owners                            @187.133.127.27  (phpMyAdmin, mig.149/159/164)
--   user_owner_membership             @187.133.127.27  (phpMyAdmin, mig.149/164)
--   view_fleet_units_tco              @189.168.87.69   (runner self-hosted, mig.169)
--   view_fleet_model_failure_patterns @189.168.87.69   (runner self-hosted, mig.169)
-- Las otras 4 (owner_profiles, owner_service_links, view_fleet_oee_factors,
-- view_fleet_fuel_efficiency) ya tienen DEFINER=...@127.0.0.1 — sin cambios.
--
-- Hallazgo preventivo crítico: `user_owner_membership` está rota y la usa
-- auth.ts en múltiples rutas (resolveOwnerScope, isUserInOwnerScope, los
-- endpoints /users/:id/owners, /users/:uuid/node). Hoy duerme porque GrayMan
-- (permissions=['*']) siempre toma el atajo que salta esa consulta — el
-- primer Arc/MU real con `fleet:scoped` la habría disparado con el mismo 500.
--
-- SOLUCIÓN: SQL SECURITY INVOKER (no un DEFINER fijo a otro host, que solo
-- reubicaría el mismo bug). Bajo INVOKER, MySQL evalúa cada vista con los
-- privilegios de la conexión que la está consultando en ese momento — la
-- app siempre puede, sin importar qué host ejecutó el CREATE VIEW original.
--
-- Cond.1 Bravo (2026-07-31, dictamen R CONDICIONADO 8/8): el cuerpo SQL de
-- view_fleet_units_tco / view_fleet_model_failure_patterns es el estado
-- REAL post-mig.169 (category_id + JOIN common_catalogs) — NO el de mig.164
-- (ft.category ENUM, ya eliminado por la propia 169). owners /
-- user_owner_membership permanecen SELECT * simple sobre su tabla base.
-- TCO/patterns JOIN tenants directo (base), no vista-sobre-vista.
--
-- Idempotente: CREATE OR REPLACE VIEW siempre reemplaza sin requerir DROP
-- previo ni IF NOT EXISTS (mismo patrón ya usado en mig.149/159/164/169).
-- Verificado en terreno: correr esta migración 2 veces seguidas produce el
-- mismo resultado (SECURITY_TYPE=INVOKER en las 4, smoke query idéntico).

SET NAMES utf8mb4;

-- ─── (1) owners — SELECT * simple sobre tenants ──────────────────────────
CREATE OR REPLACE
  SQL SECURITY INVOKER
  VIEW owners AS
SELECT * FROM tenants;

-- ─── (2) user_owner_membership — SELECT * simple sobre tenant_user_memberships ─
CREATE OR REPLACE
  SQL SECURITY INVOKER
  VIEW user_owner_membership AS
SELECT * FROM tenant_user_memberships;

-- ─── (3) view_fleet_units_tco — cuerpo real post-mig.169 (category_id) ───
CREATE OR REPLACE
  SQL SECURITY INVOKER
  VIEW view_fleet_units_tco AS
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

-- ─── (4) view_fleet_model_failure_patterns — cuerpo real post-mig.169 ────
CREATE OR REPLACE
  SQL SECURITY INVOKER
  VIEW view_fleet_model_failure_patterns AS
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

-- ─── Verificación (Cond.4 Bravo) ──────────────────────────────────────────
-- Esperado: las 4 filas con SECURITY_TYPE = 'INVOKER'.
SELECT TABLE_NAME, SECURITY_TYPE
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('owners', 'user_owner_membership', 'view_fleet_units_tco', 'view_fleet_model_failure_patterns')
ORDER BY TABLE_NAME;

-- Smoke test — las 4 vistas siguen siendo consultables (0 filas es válido,
-- lo único que HALT es un error de SQL/permiso al ejecutar el SELECT).
SELECT 'smoke_owners' k, COUNT(*) v FROM owners
UNION SELECT 'smoke_user_owner_membership', COUNT(*) FROM user_owner_membership
UNION SELECT 'smoke_view_fleet_units_tco', COUNT(*) FROM view_fleet_units_tco
UNION SELECT 'smoke_view_fleet_model_failure_patterns', COUNT(*) FROM view_fleet_model_failure_patterns;
