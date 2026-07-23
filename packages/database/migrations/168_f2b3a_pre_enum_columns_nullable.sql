-- Migration 168: FC 082 F2b3a-pre — vuelve nullable las 6 columnas ENUM
-- que serán DROPeadas en F2b3b, sin tocar el dominio de valores ni los
-- datos existentes.
--
-- DECISIÓN DE DISEÑO (Cláusula L, corrección Cond.1 de Bravo en la
-- auditoría R de F2b3, 2026-07-22 19:10:26): las 6 columnas son ENUM
-- NOT NULL sin default. Un INSERT/UPDATE que las omita FALLA en MySQL
-- (no se degrada a NULL silenciosamente) — por lo tanto el código de
-- F2b3a (dejar de escribir el ENUM) NO puede desplegarse mientras las
-- columnas sigan NOT NULL. Esta migración es el paso previo obligatorio:
-- solo relaja la restricción, no cambia ningún valor existente ni el
-- dominio del ENUM. Backup AES + verificación previa vía db-migrations.yml,
-- mismo patrón C-ventana que 166/167.
--
-- Cond.2 Bravo verificada por Ω vía phpMyAdmin (2026-07-22): SELECT
-- COUNT(*) FROM fleet_maintenance_logs = 0 — la columna entra a esta
-- migración sin objeción, tabla vacía en PROD.
--
-- Valores ENUM verificados contra PROD real vía phpMyAdmin (Editor
-- ENUM/SET, 2026-07-22) — NO se asumieron desde el historial de
-- migraciones, que resultó tener una inconsistencia real: la migración
-- 134 restableció financial_transactions.category SIN 'TENENCIA'/
-- 'VERIFICACION' (probable copy-paste del CREATE TABLE original de 085,
-- sin considerar la extensión de 127). El valor VIVO en PROD SÍ incluye
-- ambos — confirmado carácter por carácter en el editor de phpMyAdmin,
-- no por inferencia de archivos de migración.
--
-- Nota de terreno: information_schema.COLUMNS devolvió vacío en este
-- hosting para estas consultas (aunque information_schema.TABLES sí
-- funciona, usado en orphan_check.sql) — por eso la verificación final
-- de este archivo usa SHOW COLUMNS, no information_schema.COLUMNS.
--
-- Idempotente: MODIFY COLUMN con la misma definición no falla si ya se
-- corrió antes (MySQL simplemente re-aplica la misma definición).

SET NAMES utf8mb4;

-- ═══ (1) financial_transactions.category / .source ═══════════════════════
ALTER TABLE financial_transactions
  MODIFY COLUMN category ENUM(
    'LEASE','INSURANCE','MAINTENANCE','FUEL','TIRE','FINE','REPAIR',
    'TENENCIA','VERIFICACION','OTHER'
  ) NULL;

ALTER TABLE financial_transactions
  MODIFY COLUMN source ENUM('AUTO','MANUAL') NULL DEFAULT 'MANUAL';

-- ═══ (2) fleet_maintenance_extensions.service_type / .system_recommended_type
ALTER TABLE fleet_maintenance_extensions
  MODIFY COLUMN service_type
    ENUM('BASIC_10K','INTERMEDIATE_20K','MAJOR_30K','ADVANCED_50K','MINOR_MINING') NULL;

ALTER TABLE fleet_maintenance_extensions
  MODIFY COLUMN system_recommended_type
    ENUM('BASIC_10K','INTERMEDIATE_20K','MAJOR_30K','ADVANCED_50K','MINOR_MINING') NULL DEFAULT NULL;

-- ═══ (3) fleet_maintenance_logs.service_type ══════════════════════════════
-- Cond.2 Bravo: tabla confirmada vacía en PROD (COUNT=0) antes de este ALTER.
ALTER TABLE fleet_maintenance_logs
  MODIFY COLUMN service_type
    ENUM('BASIC_10K','INTERMEDIATE_20K','MAJOR_30K','ADVANCED_50K','MINOR_MINING') NULL;

-- ═══ (4) route_incidents.category ═════════════════════════════════════════
ALTER TABLE route_incidents
  MODIFY COLUMN category ENUM('MECANICA','SINIESTRO','LEGAL','OPERATIVA','OTRA') NULL;

-- ═══ Verificación — confirma que las 6 columnas ahora aceptan NULL ═══════
-- SHOW COLUMNS en vez de information_schema.COLUMNS (esta última devuelve
-- vacío en este hosting para consultas de columnas, aunque
-- information_schema.TABLES sí funciona — verificado en terreno 2026-07-22).
SHOW COLUMNS FROM financial_transactions WHERE Field IN ('category','source');
SHOW COLUMNS FROM fleet_maintenance_extensions WHERE Field IN ('service_type','system_recommended_type');
SHOW COLUMNS FROM fleet_maintenance_logs WHERE Field = 'service_type';
SHOW COLUMNS FROM route_incidents WHERE Field = 'category';
-- Esperado: columna "Null" = YES en las 6 filas. Ningún valor existente
-- cambia — el ENUM sigue siendo la fuente de verdad hasta F2b3b (DROP).
