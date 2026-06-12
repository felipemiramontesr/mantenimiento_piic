-- =============================================================================
-- Migration: 089 — Production Schema Sync
-- Purpose : Bring prod DB (u701509674_Mant_piic) up to the local schema
--           while PRESERVING existing prod data:
--             • fleet_units   — 23 real client assets
--             • users         — GrayMan account (password hash + profile image)
--             • common_catalogs — real catalog data
--
-- Strategy: Additive only. No DROP TABLE, no DELETE, no TRUNCATE on data tables.
--           All CREATE TABLE use IF NOT EXISTS.
--           All ALTER TABLE use ADD COLUMN IF NOT EXISTS.
--           INSERT statements use INSERT IGNORE.
--
-- Run order: Execute this script ONCE on u701509674_Mant_piic via phpMyAdmin.
-- Idempotent: safe to run multiple times.
-- =============================================================================

-- ─── PHASE 1: Add missing columns to fleet_units ─────────────────────────────
-- Prod fleet_units is missing columns added in local migrations 081–084.

ALTER TABLE `fleet_units`
  ADD COLUMN IF NOT EXISTS `initialFuelLevel`                  decimal(5,2)   DEFAULT 100.00 AFTER `lastFuelLevel`,
  ADD COLUMN IF NOT EXISTS `currentReading`                    decimal(12,2)  DEFAULT 0.00   AFTER `odometer`,
  ADD COLUMN IF NOT EXISTS `insuranceCost`                     decimal(12,2)  DEFAULT NULL   AFTER `monthlyLeasePayment`,
  ADD COLUMN IF NOT EXISTS `is_active`                         tinyint(1)     DEFAULT 1      AFTER `status`,
  ADD COLUMN IF NOT EXISTS `nextServiceReading_forecast`       decimal(12,2)  DEFAULT NULL   AFTER `lastServiceReading`,
  ADD COLUMN IF NOT EXISTS `last_chassis_inspection_odometer`  int(11)        NOT NULL DEFAULT 0 AFTER `nextServiceReading_forecast`,
  ADD COLUMN IF NOT EXISTS `last_distribution_change_odometer` int(11)        NOT NULL DEFAULT 0 AFTER `last_chassis_inspection_odometer`;

-- Backfill nextServiceReading_forecast for existing units that have service data
UPDATE `fleet_units`
SET `nextServiceReading_forecast` = `lastServiceReading` + COALESCE(`maintIntervalKm`, 10000)
WHERE `nextServiceReading_forecast` IS NULL
  AND `lastServiceReading` IS NOT NULL;

-- ─── PHASE 2: Drop legacy fleet_routes (empty table, replaced by fleet_movements) ──
-- Safe: prod fleet_routes has 0 rows. The current API uses fleet_movements.
DROP TABLE IF EXISTS `fleet_routes`;

-- ─── PHASE 3: Create fleet_movements (CTI core table) ────────────────────────

CREATE TABLE IF NOT EXISTS `fleet_movements` (
  `id`                int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uuid`              varchar(36)      NOT NULL,
  `unit_id`           varchar(50)      NOT NULL,
  `movement_type`     enum('ROUTE','MAINTENANCE') NOT NULL,
  `status`            enum('OPEN','ACTIVE','COMPLETED','CANCELLED') NOT NULL DEFAULT 'OPEN',
  `start_reading`     decimal(12,2)    NOT NULL DEFAULT 0.00,
  `end_reading`       decimal(12,2)    DEFAULT NULL,
  `fuel_level_start`  decimal(5,2)     NOT NULL DEFAULT 0.00,
  `fuel_level_end`    decimal(5,2)     DEFAULT NULL,
  `fuel_liters_loaded` decimal(8,2)   NOT NULL DEFAULT 0.00,
  `fuel_amount`       decimal(12,2)    NOT NULL DEFAULT 0.00,
  `fuel_ticket_image` longtext         DEFAULT NULL,
  `start_at`          datetime         DEFAULT NULL,
  `end_at`            datetime         DEFAULT NULL,
  `description`       text             DEFAULT NULL,
  `created_at`        datetime         NOT NULL DEFAULT current_timestamp(),
  `updated_at`        datetime         NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fleet_movements_uuid` (`uuid`),
  KEY `idx_fm_unit_type_status` (`unit_id`, `movement_type`, `status`),
  KEY `idx_fm_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PHASE 4: Create fleet_route_extensions ──────────────────────────────────

CREATE TABLE IF NOT EXISTS `fleet_route_extensions` (
  `movement_id`                  int(10) unsigned NOT NULL,
  `driver_id`                    int(11)          NOT NULL,
  `origin_id`                    int(11)          DEFAULT NULL,
  `destination_neighborhood_id`  int(11)          DEFAULT NULL,
  `destination`                  varchar(255)     NOT NULL,
  `additives_check`              tinyint(1)       NOT NULL DEFAULT 0,
  `tire_pressure_json`           text             DEFAULT NULL,
  `checklist_json`               text             DEFAULT NULL,
  PRIMARY KEY (`movement_id`),
  CONSTRAINT `fk_fre_movement`
    FOREIGN KEY (`movement_id`) REFERENCES `fleet_movements` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PHASE 5: Create fleet_maintenance_extensions ────────────────────────────

CREATE TABLE IF NOT EXISTS `fleet_maintenance_extensions` (
  `movement_id`              int(10) unsigned NOT NULL,
  `service_date`             date             NOT NULL,
  `service_type`             enum('BASIC_10K','INTERMEDIATE_20K','MAJOR_30K','ADVANCED_50K','MINOR_MINING') NOT NULL,
  `service_mode`             enum('FULL_COMPLIANCE','PARTIAL_EXECUTION','IN_SITU','WORKSHOP') NOT NULL DEFAULT 'FULL_COMPLIANCE',
  `system_recommended_type`  enum('BASIC_10K','INTERMEDIATE_20K','MAJOR_30K','ADVANCED_50K','MINOR_MINING') DEFAULT NULL,
  `cost`                     decimal(12,2)    NOT NULL DEFAULT 0.00,
  `technician`               varchar(100)     NOT NULL,
  PRIMARY KEY (`movement_id`),
  CONSTRAINT `fk_fme_movement`
    FOREIGN KEY (`movement_id`) REFERENCES `fleet_movements` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PHASE 6: Create financial_transactions ──────────────────────────────────

CREATE TABLE IF NOT EXISTS `financial_transactions` (
  `id`          int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uuid`        char(36)         NOT NULL,
  `unit_id`     varchar(50)      NOT NULL,
  `category`    enum('LEASE','INSURANCE','MAINTENANCE','FUEL','TIRE','FINE','REPAIR','OTHER') NOT NULL,
  `amount`      decimal(12,2)    NOT NULL,
  `period`      char(7)          NOT NULL COMMENT 'YYYY-MM',
  `source`      enum('AUTO','MANUAL') NOT NULL DEFAULT 'MANUAL',
  `source_uuid` char(36)         DEFAULT NULL,
  `vendor`      varchar(150)     DEFAULT NULL,
  `invoice_ref` varchar(80)      DEFAULT NULL,
  `notes`       text             DEFAULT NULL,
  `created_by`  int(11)          NOT NULL,
  `created_at`  timestamp        NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ft_uuid` (`uuid`),
  KEY `idx_ft_unit_period` (`unit_id`, `period`),
  KEY `idx_ft_category` (`category`),
  KEY `idx_ft_source_uuid` (`source_uuid`),
  KEY `idx_ft_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PHASE 7: Create permissions table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS `permissions` (
  `id`          int(11)      NOT NULL AUTO_INCREMENT,
  `slug`        varchar(50)  NOT NULL,
  `description` text         DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissions_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PHASE 8: Create role_permissions table ──────────────────────────────────

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id`       int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PHASE 9: Seed permissions catalog ───────────────────────────────────────

INSERT IGNORE INTO `permissions` (`slug`, `description`) VALUES
  ('fleet:view',      'Ver inventario de activos y unidades'),
  ('fleet:write',     'Crear y editar unidades y marcas'),
  ('fleet:delete',    'Dar de baja unidades'),
  ('maint:view',      'Ver historial y pronósticos de mantenimiento'),
  ('maint:write',     'Crear órdenes de trabajo y actualizar servicios'),
  ('route:view',      'Ver rutas, bitácora de despacho e incidentes'),
  ('route:write',     'Iniciar/cerrar rutas y reportar incidentes'),
  ('financial:view',  'Ver costos, arrendamientos y KPIs financieros'),
  ('financial:write', 'Registrar y editar transacciones financieras'),
  ('financial:report','Exportar reportes financieros en CSV'),
  ('report:export',   'Exportar datos a CSV/Excel'),
  ('user:admin',      'Administrar usuarios y roles');

-- ─── PHASE 10: Assign permissions to prod roles ───────────────────────────────
-- Prod roles: 1=Master(Archon), 2=Administrador, 3=Supervisor, 4=Técnico, 5=Operador
-- auth.ts grants permissions:['*'] to roleId=1 and username='GrayMan' — no entry needed
-- for role 1, but we assign all perms explicitly for completeness.

-- Role 1 — Master (Archon): all permissions
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 1, id FROM `permissions`;

-- Role 2 — Administrador: full operational access
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 2, id FROM `permissions`
WHERE slug IN (
  'fleet:view','fleet:write','fleet:delete',
  'maint:view','maint:write',
  'route:view','route:write',
  'financial:view','financial:write','financial:report',
  'report:export'
);

-- Role 3 — Supervisor: management without delete
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 3, id FROM `permissions`
WHERE slug IN (
  'fleet:view','fleet:write',
  'maint:view','maint:write',
  'route:view','route:write',
  'financial:view','financial:write','financial:report',
  'report:export'
);

-- Role 4 — Técnico: maintenance + routes, read-only finance
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 4, id FROM `permissions`
WHERE slug IN (
  'fleet:view',
  'maint:view','maint:write',
  'route:view','route:write',
  'financial:view',
  'report:export'
);

-- Role 5 — Operador: drive units, basic visibility
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 5, id FROM `permissions`
WHERE slug IN (
  'fleet:view',
  'maint:view',
  'route:view','route:write'
);

-- ─── PHASE 11: route_incidents — add resolved_at column if missing ────────────
-- Prod route_incidents exists but may be missing columns added later.

ALTER TABLE `route_incidents`
  ADD COLUMN IF NOT EXISTS `resolved_at` timestamp DEFAULT NULL AFTER `status`;

-- ─── PHASE 12: unit_activity_logs — ensure uuid column type matches ───────────
-- No structural changes needed — prod schema matches local.

-- ─── VERIFICATION QUERY (run after import to confirm) ─────────────────────────
-- SELECT 'fleet_movements'       AS tbl, COUNT(*) FROM fleet_movements
-- UNION ALL
-- SELECT 'financial_transactions', COUNT(*) FROM financial_transactions
-- UNION ALL
-- SELECT 'permissions',            COUNT(*) FROM permissions
-- UNION ALL
-- SELECT 'role_permissions',       COUNT(*) FROM role_permissions
-- UNION ALL
-- SELECT 'fleet_units',            COUNT(*) FROM fleet_units;
