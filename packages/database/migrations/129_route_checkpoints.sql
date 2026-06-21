-- ============================================================
-- Migration 129: fleet_route_checkpoints
-- FC-4: RouteCheckpoints_Waypoints · Fase 4A
-- Checkpoints/waypoints intermedios por ruta activa (1:N sobre fleet_movements)
-- Idempotente: CREATE TABLE IF NOT EXISTS + IF NOT EXISTS en índices
-- ============================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `fleet_route_checkpoints` (
  `id`              int(10) unsigned NOT NULL AUTO_INCREMENT,
  `movement_id`     int(10) unsigned NOT NULL,
  `sequence`        tinyint(3) unsigned NOT NULL,
  `name`            varchar(150)     NOT NULL,
  `neighborhood_id` int(11)          DEFAULT NULL,
  `eta`             datetime         DEFAULT NULL,
  `arrived_at`      datetime         DEFAULT NULL,
  `status`          enum('PENDING','VISITED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  `created_at`      timestamp        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_checkpoint_sequence` (`movement_id`, `sequence`),
  KEY `idx_checkpoint_movement` (`movement_id`),
  KEY `idx_checkpoint_status` (`status`),
  CONSTRAINT `fk_chk_movement`
    FOREIGN KEY (`movement_id`) REFERENCES `fleet_movements` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
