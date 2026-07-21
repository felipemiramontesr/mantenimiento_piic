-- Migration 167: FC 082 F2b1 — Re-backfill del delta post-F2a (Cond.3 Bravo)
-- Alcance: dictamen R CONDICIONADO 6/6 de Bravo (2026-07-21) sobre 086_AN.
--
-- Entre el cierre de F2a (166, aplicada) y el deploy del código F2b1
-- (dual-write en finance.ts/fleetMaintenance.ts/routeService.ts), cualquier
-- fila creada por el código viejo (que solo escribía el ENUM string) quedó
-- con su columna *_id en NULL. Este script re-corre exactamente el mismo
-- backfill UPDATE...JOIN de la 166 sobre esas filas — 100% idempotente, no
-- toca filas que ya tengan su *_id resuelto (WHERE *_id IS NULL).
--
-- No es DDL (ninguna columna/índice/FK nueva) — solo backfill de datos. Se
-- corre vía el mismo pipeline db-migrations (C-ventana) por disciplina y
-- trazabilidad, no porque sea destructivo.

SET NAMES utf8mb4;

UPDATE financial_transactions ft
JOIN common_catalogs cc ON cc.category = 'FINANCE_CATEGORY' AND cc.code = ft.category
SET ft.category_id = cc.id
WHERE ft.category_id IS NULL;

UPDATE financial_transactions ft
JOIN common_catalogs cc ON cc.category = 'FINANCE_SOURCE' AND cc.code = ft.source
SET ft.source_id = cc.id
WHERE ft.source_id IS NULL;

-- fleet_maintenance_extensions usa COLLATE utf8mb4_general_ci (mismo hallazgo
-- que en la 166) — COLLATE explícito para evitar ERROR 1267.
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

UPDATE route_incidents ri
JOIN common_catalogs cc ON cc.category = 'INCIDENT_CATEGORY' AND cc.code = ri.category
SET ri.category_id = cc.id
WHERE ri.category_id IS NULL;

-- fleet_maintenance_logs: SIN escritor vivo en apps/ (086_AN §6, Cond.1
-- resuelta) — no hay delta que re-backfillear para esta tabla. Se incluye
-- el UPDATE de todas formas por completitud/simetría con la 166 y porque es
-- inofensivo (no-op si no hay filas con service_type_id NULL).
UPDATE fleet_maintenance_logs fml
JOIN common_catalogs cc ON cc.category = 'MAINT_SERVICE_TYPE' AND cc.code = fml.service_type
SET fml.service_type_id = cc.id
WHERE fml.service_type_id IS NULL;

-- ═══ Verificación — debe leer 0 en todas si no hubo delta, o el conteo del
--     delta si lo hubo (ambos casos son éxito; > 0 después del backfill sí
--     sería falla).
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
  (SELECT COUNT(*) FROM route_incidents WHERE category_id IS NULL);
-- Esperado: todo 0 tras este script. Si algo > 0, hay un código nuevo
-- desconocido en las filas (no cubierto por los mapeos de común_catalogs) —
-- HALT + Ω, mismo patrón que Inv-A de la 166.
