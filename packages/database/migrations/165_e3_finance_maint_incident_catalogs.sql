-- Migration 165: FC 082 F1 E3 — Catálogos FINANCE_*/MAINT_SERVICE_TYPE/INCIDENT_CATEGORY
-- Alcance aprobado: dictamen O Alfa (2026-07-19 23:44) + auditoría R Bravo
-- FAVORABLE CONDICIONADO 7/7 (2026-07-20 00:14:59, Cond.2) + Cond.8 huérfanos
-- (2026-07-20 12:15:01). Ver 085_AN_Fc082_F1_Censo_Ssot_Roles.md §2b/§3.
--
-- Alcance de ESTA migración (DB Delta del FC 082: "CREATE catálogos (censo F1)"):
-- SOLO sembrar los 4 dominios de catálogo en common_catalogs. NO se tocan las
-- tablas operativas (financial_transactions, fleet_maintenance_*,
-- route_incidents): el ALTER TABLE (columna FK nullable + backfill + DROP
-- del ENUM legacy) es explícitamente Fase 2 (ventana C-ventana) — "ALTER
-- operativas FK + DROP ENUMs (F2)" en el DB Delta del FC. Esta migración es
-- 100% aditiva: no destructiva, sin ventana requerida para redactarla, pero
-- HALT de aplicación a prod hasta backup+ventana (Cond.1/Cond.8 Bravo).
--
-- Excluidos de este alcance (085_AN §2b, Cond.2 Bravo): UPA (diferido a K),
-- fleet_movements/fleet_route_checkpoints/fleet_unit_recalls/route_incidents.
-- severity/status (máquinas de estado de bajo valor, quedan como ENUM salvo
-- que Ω lo pida) y fleet_maintenance_extensions.service_mode (dominio
-- distinto de service_type, no aprobado en esta pasada).
--
-- IDs reservados permanentemente — no reutilizar (patrón migración 121):
--   FINANCE_CATEGORY    9100-9109
--   FINANCE_SOURCE       9110-9111
--   MAINT_SERVICE_TYPE   9120-9124
--   INCIDENT_CATEGORY    9130-9134
-- Idempotente (§23.2): ON DUPLICATE KEY UPDATE sobre el PK id explícito
-- (mismo patrón que 121_fleet_area_catalog.sql).

SET NAMES utf8mb4;

-- ─── FINANCE_CATEGORY (financial_transactions.category, 10 valores) ──────────
INSERT INTO common_catalogs (id, category, code, label) VALUES
  (9100, 'FINANCE_CATEGORY', 'LEASE',         'Arrendamiento'),
  (9101, 'FINANCE_CATEGORY', 'INSURANCE',     'Seguro'),
  (9102, 'FINANCE_CATEGORY', 'MAINTENANCE',   'Mantenimiento'),
  (9103, 'FINANCE_CATEGORY', 'FUEL',          'Combustible'),
  (9104, 'FINANCE_CATEGORY', 'TIRE',          'Llantas'),
  (9105, 'FINANCE_CATEGORY', 'FINE',          'Multa'),
  (9106, 'FINANCE_CATEGORY', 'REPAIR',        'Reparación'),
  (9107, 'FINANCE_CATEGORY', 'TENENCIA',      'Tenencia'),
  (9108, 'FINANCE_CATEGORY', 'VERIFICACION',  'Verificación'),
  (9109, 'FINANCE_CATEGORY', 'OTHER',         'Otro')
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- ─── FINANCE_SOURCE (financial_transactions.source, 2 valores) ───────────────
INSERT INTO common_catalogs (id, category, code, label) VALUES
  (9110, 'FINANCE_SOURCE', 'AUTO',   'Automático'),
  (9111, 'FINANCE_SOURCE', 'MANUAL', 'Manual')
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- ─── MAINT_SERVICE_TYPE (unifica 3 columnas duplicadas: ──────────────────────
--     fleet_maintenance_extensions.service_type/system_recommended_type +
--     fleet_maintenance_logs.service_type — mismo dominio, 5 valores)
INSERT INTO common_catalogs (id, category, code, label) VALUES
  (9120, 'MAINT_SERVICE_TYPE', 'BASIC_10K',        'Básico 10K'),
  (9121, 'MAINT_SERVICE_TYPE', 'INTERMEDIATE_20K', 'Intermedio 20K'),
  (9122, 'MAINT_SERVICE_TYPE', 'MAJOR_30K',        'Mayor 30K'),
  (9123, 'MAINT_SERVICE_TYPE', 'ADVANCED_50K',     'Avanzado 50K'),
  (9124, 'MAINT_SERVICE_TYPE', 'MINOR_MINING',     'Menor Minero')
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- ─── INCIDENT_CATEGORY (route_incidents.category, 5 valores) ─────────────────
INSERT INTO common_catalogs (id, category, code, label) VALUES
  (9130, 'INCIDENT_CATEGORY', 'MECANICA',  'Mecánica'),
  (9131, 'INCIDENT_CATEGORY', 'SINIESTRO', 'Siniestro'),
  (9132, 'INCIDENT_CATEGORY', 'LEGAL',     'Legal'),
  (9133, 'INCIDENT_CATEGORY', 'OPERATIVA', 'Operativa'),
  (9134, 'INCIDENT_CATEGORY', 'OTRA',      'Otra')
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- ─── Verificación post (Cond.8 — confirma siembra, no altera nada más) ───────
SELECT 'FINANCE_CATEGORY_rows' k, COUNT(*) v FROM common_catalogs WHERE category='FINANCE_CATEGORY'
UNION SELECT 'FINANCE_SOURCE_rows', COUNT(*) FROM common_catalogs WHERE category='FINANCE_SOURCE'
UNION SELECT 'MAINT_SERVICE_TYPE_rows', COUNT(*) FROM common_catalogs WHERE category='MAINT_SERVICE_TYPE'
UNION SELECT 'INCIDENT_CATEGORY_rows', COUNT(*) FROM common_catalogs WHERE category='INCIDENT_CATEGORY'
UNION SELECT 'financial_transactions_intacta', COUNT(*) FROM financial_transactions
UNION SELECT 'fleet_maintenance_extensions_intacta', COUNT(*) FROM fleet_maintenance_extensions
UNION SELECT 'route_incidents_intacta', COUNT(*) FROM route_incidents;
-- Esperado: 10/2/5/5 filas de catálogo sembradas; las 3 tablas operativas
-- con su conteo PREVIO intacto (esta migración no las toca — F2 las altera).
