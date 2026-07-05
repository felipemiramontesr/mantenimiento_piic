-- ============================================================
-- 156_legacy_purge.sql — FC 062 F5 · Data_Sanitation_Legacy_Purge (v1.2)
-- Purga IDEMPOTENTE de datos demo/legacy (seeds FaseA/B/C del FC
-- DataResilience). Segunda ejecución = 0 filas afectadas (Scenario 6).
--
-- v1.1 (terreno PROD): unidades demo al FINAL tras SEED_B/C + purga y
-- respaldo de TODOS sus dependientes por FK (#1451 corregido).
-- v1.2 (terreno PROD): deriva de esquema local↔PROD — realtime_telemetry
-- NO existe en PROD (#1146). TODA operación sobre tablas no confirmadas
-- en ambos entornos queda tras guard de information_schema (§23.2):
-- fleet_maintenance_details/extensions · realtime_telemetry ·
-- unit_activity_logs · upa_work_orders/upa_work_order_tasks ·
-- catalog_recalls/fleet_unit_recalls. Confirmadas en ambos:
-- fleet_movements, fleet_route_extensions, fleet_route_checkpoints,
-- financial_transactions, route_incidents, fleet_units.
--
-- ÁMBITO (inventario auditable — Apéndice F5 del FC 062):
--   · SEED_A : fleet_movements description='SEED_A' + cadena FK completa
--     + unidades demo puras PIIC-304/305 (sin placas reales).
--   · SEED_B : financial_transactions notes='SEED_B' · route_incidents
--     description '[SEED_B]%'.
--   · SEED_C : catalog_recalls 'DC-%' + fleet_unit_recalls (guarded).
--   · NO toca: owners, users, unidades con placas reales, catálogos,
--     datos fleet_master del cliente.
--
-- BACKUP PREVIO OBLIGATORIO (dos capas):
--   1) Dump externo ANTES de ejecutar (PROD: exclusivo de Ω, ventana §20).
--   2) Backup en tablas zz_fc062_* dentro de este mismo script
--      (idempotente: CREATE IF NOT EXISTS + INSERT IGNORE por PK).
--
-- ESPEJO PROD: este mismo archivo es el script espejo — no referencia
-- el nombre del schema (usa DATABASE()). PROD: exclusivo de Ω (§18.1).
-- ============================================================

SET NAMES utf8mb4;

-- ─── 0 · Detección de tablas opcionales (deriva local↔PROD) ─────────

SET @has_maint_det := (SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fleet_maintenance_details');
SET @has_maint_ext := (SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fleet_maintenance_extensions');
SET @has_telemetry := (SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'realtime_telemetry');
SET @has_activity := (SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'unit_activity_logs');
SET @has_upa_wo := (SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'upa_work_orders');
SET @has_upa_tasks := (SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'upa_work_order_tasks');
SET @has_recalls := (SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catalog_recalls');
SET @has_unit_recalls := (SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fleet_unit_recalls');

-- ─── 1 · BACKUP idempotente en tablas zz_fc062_* ─────────────────────

CREATE TABLE IF NOT EXISTS zz_fc062_bak_fleet_movements LIKE fleet_movements;
INSERT IGNORE INTO zz_fc062_bak_fleet_movements
SELECT * FROM fleet_movements WHERE description = 'SEED_A';

CREATE TABLE IF NOT EXISTS zz_fc062_bak_route_extensions LIKE fleet_route_extensions;
INSERT IGNORE INTO zz_fc062_bak_route_extensions
SELECT fre.* FROM fleet_route_extensions fre
JOIN fleet_movements fm ON fm.id = fre.movement_id
WHERE fm.description = 'SEED_A';

CREATE TABLE IF NOT EXISTS zz_fc062_bak_route_checkpoints LIKE fleet_route_checkpoints;
INSERT IGNORE INTO zz_fc062_bak_route_checkpoints
SELECT frc.* FROM fleet_route_checkpoints frc
JOIN fleet_movements fm ON fm.id = frc.movement_id
WHERE fm.description = 'SEED_A';

CREATE TABLE IF NOT EXISTS zz_fc062_bak_route_incidents LIKE route_incidents;
INSERT IGNORE INTO zz_fc062_bak_route_incidents
SELECT ri.* FROM route_incidents ri
JOIN fleet_movements fm ON fm.uuid = ri.route_uuid
WHERE fm.description = 'SEED_A';
INSERT IGNORE INTO zz_fc062_bak_route_incidents
SELECT * FROM route_incidents WHERE description LIKE '[SEED_B]%';

CREATE TABLE IF NOT EXISTS zz_fc062_bak_financial_transactions LIKE financial_transactions;
INSERT IGNORE INTO zz_fc062_bak_financial_transactions
SELECT * FROM financial_transactions WHERE notes = 'SEED_B';
INSERT IGNORE INTO zz_fc062_bak_financial_transactions
SELECT * FROM financial_transactions WHERE unit_id IN ('PIIC-304', 'PIIC-305');

CREATE TABLE IF NOT EXISTS zz_fc062_bak_fleet_units LIKE fleet_units;
INSERT IGNORE INTO zz_fc062_bak_fleet_units
SELECT * FROM fleet_units WHERE id IN ('PIIC-304', 'PIIC-305');

-- Backups de tablas opcionales (guarded)

SET @sql := IF(@has_maint_det = 1,
  'CREATE TABLE IF NOT EXISTS zz_fc062_bak_maintenance_details LIKE fleet_maintenance_details',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_maint_det = 1,
  'INSERT IGNORE INTO zz_fc062_bak_maintenance_details SELECT fmd.* FROM fleet_maintenance_details fmd JOIN fleet_movements fm ON fm.id = fmd.maintenance_id WHERE fm.description = ''SEED_A''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_maint_ext = 1,
  'CREATE TABLE IF NOT EXISTS zz_fc062_bak_maintenance_extensions LIKE fleet_maintenance_extensions',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_maint_ext = 1,
  'INSERT IGNORE INTO zz_fc062_bak_maintenance_extensions SELECT fme.* FROM fleet_maintenance_extensions fme JOIN fleet_movements fm ON fm.id = fme.movement_id WHERE fm.description = ''SEED_A''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_telemetry = 1,
  'CREATE TABLE IF NOT EXISTS zz_fc062_bak_realtime_telemetry LIKE realtime_telemetry',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_telemetry = 1,
  'INSERT IGNORE INTO zz_fc062_bak_realtime_telemetry SELECT * FROM realtime_telemetry WHERE unit_id IN (''PIIC-304'', ''PIIC-305'')',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_activity = 1,
  'CREATE TABLE IF NOT EXISTS zz_fc062_bak_unit_activity_logs LIKE unit_activity_logs',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_activity = 1,
  'INSERT IGNORE INTO zz_fc062_bak_unit_activity_logs SELECT * FROM unit_activity_logs WHERE unit_id IN (''PIIC-304'', ''PIIC-305'')',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_upa_tasks = 1 AND @has_upa_wo = 1,
  'CREATE TABLE IF NOT EXISTS zz_fc062_bak_upa_work_order_tasks LIKE upa_work_order_tasks',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_upa_tasks = 1 AND @has_upa_wo = 1,
  'INSERT IGNORE INTO zz_fc062_bak_upa_work_order_tasks SELECT t.* FROM upa_work_order_tasks t JOIN upa_work_orders wo ON wo.id = t.work_order_id WHERE wo.vehicle_id IN (''PIIC-304'', ''PIIC-305'')',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_upa_wo = 1,
  'CREATE TABLE IF NOT EXISTS zz_fc062_bak_upa_work_orders LIKE upa_work_orders',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_upa_wo = 1,
  'INSERT IGNORE INTO zz_fc062_bak_upa_work_orders SELECT * FROM upa_work_orders WHERE vehicle_id IN (''PIIC-304'', ''PIIC-305'')',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── 2 · PURGA SEED_A — cadena FK completa, orden inverso ────────────

DELETE ri FROM route_incidents ri
JOIN fleet_movements fm ON fm.uuid = ri.route_uuid
WHERE fm.description = 'SEED_A';

SET @sql := IF(@has_maint_det = 1,
  'DELETE fmd FROM fleet_maintenance_details fmd JOIN fleet_movements fm ON fm.id = fmd.maintenance_id WHERE fm.description = ''SEED_A''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_maint_ext = 1,
  'DELETE fme FROM fleet_maintenance_extensions fme JOIN fleet_movements fm ON fm.id = fme.movement_id WHERE fm.description = ''SEED_A''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

DELETE frc FROM fleet_route_checkpoints frc
JOIN fleet_movements fm ON fm.id = frc.movement_id
WHERE fm.description = 'SEED_A';

DELETE fre FROM fleet_route_extensions fre
JOIN fleet_movements fm ON fm.id = fre.movement_id
WHERE fm.description = 'SEED_A';

DELETE FROM fleet_movements WHERE description = 'SEED_A';

-- ─── 3 · PURGA SEED_B ────────────────────────────────────────────────

DELETE FROM route_incidents WHERE description LIKE '[SEED_B]%';
DELETE FROM financial_transactions WHERE notes = 'SEED_B';

-- ─── 4 · PURGA SEED_C — guarded ──────────────────────────────────────

SET @sql := IF(
  @has_recalls = 1 AND @has_unit_recalls = 1,
  'DELETE fur FROM fleet_unit_recalls fur JOIN catalog_recalls cr ON cr.id = fur.recall_id WHERE cr.campaign_code LIKE ''DC-%''',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @has_recalls = 1,
  'DELETE FROM catalog_recalls WHERE campaign_code LIKE ''DC-%''',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Revert compliance demo de PIIC-202 (SEED_C) — solo si porta firma demo
UPDATE fleet_units SET
  insuranceExpiryDate     = NULL,
  vencimientoVerificacion = NULL,
  insurancePolicyNumber   = NULL
WHERE id = 'PIIC-202'
  AND insurancePolicyNumber LIKE 'DC-%';

-- ─── 5 · UNIDADES DEMO PIIC-304/305 — AL FINAL, dependientes primero ─
-- Las unidades son artefactos del seeding (sin placas reales): todo lo
-- que cuelga de ellas es demo por construcción y quedó respaldado en §1.

SET @sql := IF(@has_upa_tasks = 1 AND @has_upa_wo = 1,
  'DELETE t FROM upa_work_order_tasks t JOIN upa_work_orders wo ON wo.id = t.work_order_id WHERE wo.vehicle_id IN (''PIIC-304'', ''PIIC-305'')',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_upa_wo = 1,
  'DELETE wo FROM upa_work_orders wo LEFT JOIN fleet_movements fm ON fm.upa_work_order_id = wo.id WHERE wo.vehicle_id IN (''PIIC-304'', ''PIIC-305'') AND fm.id IS NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

DELETE FROM financial_transactions WHERE unit_id IN ('PIIC-304', 'PIIC-305');

SET @sql := IF(@has_telemetry = 1,
  'DELETE FROM realtime_telemetry WHERE unit_id IN (''PIIC-304'', ''PIIC-305'')',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_activity = 1,
  'DELETE FROM unit_activity_logs WHERE unit_id IN (''PIIC-304'', ''PIIC-305'')',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Fail-safe final: solo si ya no queda NINGÚN movimiento de la unidad
DELETE fu FROM fleet_units fu
LEFT JOIN fleet_movements fm ON fm.unit_id = fu.id
WHERE fu.id IN ('PIIC-304', 'PIIC-305') AND fm.id IS NULL;

-- ─── 6 · VERIFICACIÓN (todos deben ser 0 — Scenario 6/aserción SQL) ──

SELECT
  (SELECT COUNT(*) FROM fleet_movements WHERE description = 'SEED_A') AS seed_a_movements,
  (SELECT COUNT(*) FROM fleet_route_extensions fre
     JOIN fleet_movements fm ON fm.id = fre.movement_id
     WHERE fm.description = 'SEED_A') AS seed_a_extensions,
  (SELECT COUNT(*) FROM financial_transactions WHERE notes = 'SEED_B') AS seed_b_transactions,
  (SELECT COUNT(*) FROM route_incidents WHERE description LIKE '[SEED_B]%') AS seed_b_incidents,
  (SELECT COUNT(*) FROM financial_transactions WHERE unit_id IN ('PIIC-304', 'PIIC-305')) AS demo_unit_financials,
  (SELECT COUNT(*) FROM fleet_units WHERE id IN ('PIIC-304', 'PIIC-305')) AS seed_a_units;
