-- ============================================================
-- 156_legacy_purge.sql — FC 062 F5 · Data_Sanitation_Legacy_Purge
-- Purga IDEMPOTENTE de datos demo/legacy (seeds FaseA/B/C del FC
-- DataResilience). Segunda ejecución = 0 filas afectadas (Scenario 6).
--
-- ÁMBITO (inventario auditable 2026-07-05, DB local `archon`):
--   · SEED_A : 465 fleet_movements (description='SEED_A') + 465
--     fleet_route_extensions + checkpoints dependientes + unidades
--     demo puras PIIC-304/PIIC-305 (sin placas reales).
--   · SEED_B : financial_transactions notes='SEED_B' · route_incidents
--     description '[SEED_B]%' (0 en local — puede haber en PROD).
--   · SEED_C : catalog_recalls campaign_code 'DC-%' + fleet_unit_recalls
--     (tablas AUSENTES en local — acceso protegido vía information_schema).
--   · NO toca: owners, users, unidades con placas reales (PIIC-101/201/
--     202/301–303), catálogos del sistema, fleet_master del cliente.
--
-- BACKUP PREVIO OBLIGATORIO (dos capas):
--   1) Dump externo ANTES de ejecutar (L §18.1/§20 — en PROD lo aplica
--      exclusivamente Ω en ventana de mantenimiento):
--        mysqldump -u <user> -p <db> fleet_movements \
--          fleet_route_extensions fleet_route_checkpoints \
--          financial_transactions route_incidents fleet_units \
--          > backup_pre_156_$(date +%Y%m%d).sql
--   2) Backup en tablas zz_fc062_* dentro de este mismo script
--      (idempotente: CREATE IF NOT EXISTS + INSERT IGNORE por PK).
--
-- ESPEJO PROD: este mismo archivo es el script espejo — no referencia
-- el nombre del schema (usa DATABASE()). PROD: exclusivo de Ω (§18.1).
-- ============================================================

SET NAMES utf8mb4;

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

CREATE TABLE IF NOT EXISTS zz_fc062_bak_financial_transactions LIKE financial_transactions;
INSERT IGNORE INTO zz_fc062_bak_financial_transactions
SELECT * FROM financial_transactions WHERE notes = 'SEED_B';

CREATE TABLE IF NOT EXISTS zz_fc062_bak_route_incidents LIKE route_incidents;
INSERT IGNORE INTO zz_fc062_bak_route_incidents
SELECT * FROM route_incidents WHERE description LIKE '[SEED_B]%';

CREATE TABLE IF NOT EXISTS zz_fc062_bak_fleet_units LIKE fleet_units;
INSERT IGNORE INTO zz_fc062_bak_fleet_units
SELECT * FROM fleet_units WHERE id IN ('PIIC-304', 'PIIC-305');

-- ─── 2 · PURGA SEED_A (orden inverso de FKs) ─────────────────────────

DELETE frc FROM fleet_route_checkpoints frc
JOIN fleet_movements fm ON fm.id = frc.movement_id
WHERE fm.description = 'SEED_A';

DELETE fre FROM fleet_route_extensions fre
JOIN fleet_movements fm ON fm.id = fre.movement_id
WHERE fm.description = 'SEED_A';

DELETE FROM fleet_movements WHERE description = 'SEED_A';

-- Unidades demo puras del seeding (sin placas reales — inventario F5).
-- Solo se eliminan si ya no tienen movimientos (fail-safe relacional).
DELETE fu FROM fleet_units fu
LEFT JOIN fleet_movements fm ON fm.unit_id = fu.id
WHERE fu.id IN ('PIIC-304', 'PIIC-305') AND fm.id IS NULL;

-- ─── 3 · PURGA SEED_B ────────────────────────────────────────────────

DELETE FROM route_incidents WHERE description LIKE '[SEED_B]%';
DELETE FROM financial_transactions WHERE notes = 'SEED_B';

-- ─── 4 · PURGA SEED_C — tablas pueden NO existir (guard §23.2) ──────

SET @has_recalls := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catalog_recalls'
);
SET @has_unit_recalls := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fleet_unit_recalls'
);

SET @sql := IF(
  @has_recalls = 1 AND @has_unit_recalls = 1,
  'DELETE fur FROM fleet_unit_recalls fur JOIN catalog_recalls cr ON cr.id = fur.recall_id WHERE cr.campaign_code LIKE ''DC-%''',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @has_recalls = 1,
  'DELETE FROM catalog_recalls WHERE campaign_code LIKE ''DC-%''',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Revert compliance demo de PIIC-202 (SEED_C) — solo donde SEED_C corrió:
-- la firma del seeding es la póliza demo; si no coincide, no toca nada.
UPDATE fleet_units SET
  insuranceExpiryDate     = NULL,
  vencimientoVerificacion = NULL,
  insurancePolicyNumber   = NULL
WHERE id = 'PIIC-202'
  AND insurancePolicyNumber LIKE 'DC-%';

-- ─── 5 · VERIFICACIÓN (todos deben ser 0 — Scenario 6/aserción SQL) ──

SELECT
  (SELECT COUNT(*) FROM fleet_movements WHERE description = 'SEED_A') AS seed_a_movements,
  (SELECT COUNT(*) FROM fleet_route_extensions fre
     JOIN fleet_movements fm ON fm.id = fre.movement_id
     WHERE fm.description = 'SEED_A') AS seed_a_extensions,
  (SELECT COUNT(*) FROM financial_transactions WHERE notes = 'SEED_B') AS seed_b_transactions,
  (SELECT COUNT(*) FROM route_incidents WHERE description LIKE '[SEED_B]%') AS seed_b_incidents,
  (SELECT COUNT(*) FROM fleet_units WHERE id IN ('PIIC-304', 'PIIC-305')) AS seed_a_units;
