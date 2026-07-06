-- ============================================================
-- 158_prod_schema_completion.sql — Cierre de deriva de esquema PROD
-- (Audit 066_AN · 2026-07-06). Consolida IDEMPOTENTEMENTE los dos huecos
-- reales de PROD vs las migraciones canónicas, detectados post-zero-state:
--   · migración 136 — notifications_outbox.user_id (+ índice + FK)
--   · migración 138 — tabla realtime_telemetry
--
-- Por qué una migración nueva en vez de re-disparar 136/138 originales:
--   · 136 Step-3 (FK) NO era idempotente (sin IF NOT EXISTS) → aquí guardada
--     con information_schema + PREPARE (patrón migración 154).
--   · 136 usaba `AFTER sent_at` (dependía de orden de columnas) → aquí sin AFTER.
--   · 138 definía unit_id COLLATE utf8mb4_general_ci, pero PROD.fleet_units.id
--     es varchar(50) utf8mb4_UNICODE_ci → el FK habría fallado por collation
--     mismatch. Aquí unit_id se alinea a utf8mb4_unicode_ci (verificado en PROD).
--
-- Estado PROD verificado (query dirigido 2026-07-06):
--   notifications_outbox = {id, permission_slug, notification_type,
--     source_uuid, sent_at} (sin user_id) · fleet_units.id = varchar(50)
--     utf8mb4_unicode_ci · users.id = int(11).
--
-- 100% idempotente (2ª ejecución = 0 cambios · Scenario 5 FC 064).
-- Aplicar exclusivamente Ω vía workflow db-migrations (§18.1).
-- ============================================================

SET NAMES utf8mb4;

-- ─── 1 · notifications_outbox.user_id (migración 136, idempotente) ──────

ALTER TABLE notifications_outbox
  ADD COLUMN IF NOT EXISTS user_id INT NULL;

ALTER TABLE notifications_outbox
  ADD INDEX IF NOT EXISTS idx_notif_outbox_user_id (user_id);

-- FK guardado — MariaDB no soporta ADD CONSTRAINT IF NOT EXISTS
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications_outbox'
    AND CONSTRAINT_NAME = 'fk_notif_outbox_user'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE notifications_outbox ADD CONSTRAINT fk_notif_outbox_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── 2 · realtime_telemetry (migración 138, collation alineada a PROD) ──

CREATE TABLE IF NOT EXISTS realtime_telemetry (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  user_id       INT              NOT NULL,
  unit_id       VARCHAR(50)      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  latitude      DECIMAL(10, 7)   NOT NULL,
  longitude     DECIMAL(10, 7)   NOT NULL,
  speed         DECIMAL(5, 2)    NOT NULL DEFAULT 0.00,
  heading       DECIMAL(5, 2)    NOT NULL DEFAULT 0.00 COMMENT 'Degrees 0-359, clockwise from north',
  updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_telemetry_user_unit (user_id, unit_id),
  INDEX       idx_telemetry_unit      (unit_id),
  INDEX       idx_telemetry_updated   (updated_at),

  CONSTRAINT fk_telemetry_user
    FOREIGN KEY (user_id)  REFERENCES users(id)       ON DELETE CASCADE,
  CONSTRAINT fk_telemetry_unit
    FOREIGN KEY (unit_id)  REFERENCES fleet_units(id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ─── 3 · VERIFICACIÓN (contadores agregados — condición 2 FC 064) ──────

SELECT
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications_outbox'
       AND COLUMN_NAME = 'user_id') AS notif_user_id_present,
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications_outbox'
       AND CONSTRAINT_NAME = 'fk_notif_outbox_user') AS notif_fk_present,
  (SELECT COUNT(*) FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'realtime_telemetry') AS telemetry_table_present,
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'realtime_telemetry') AS telemetry_col_count;
-- Esperado: notif_user_id_present=1 · notif_fk_present=1 · telemetry_table_present=1 · telemetry_col_count=8
