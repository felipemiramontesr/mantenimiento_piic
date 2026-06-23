SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 138 — realtime_telemetry table
-- FC: Realtime_Telemetry_Infrastructure · FaseA
-- Stores the latest GPS ping per (user_id, unit_id) pair.
-- Each row is an upsert target — no history, only current position.
-- EAL6+ scoping: owner_id is resolved at query time via users.owner_id JOIN.
-- =============================================================================

CREATE TABLE IF NOT EXISTS realtime_telemetry (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  user_id       INT              NOT NULL,
  unit_id       VARCHAR(50)      CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
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

-- ─── Verification ─────────────────────────────────────────────────────────────
-- DESCRIBE realtime_telemetry;
-- SHOW INDEX FROM realtime_telemetry;
