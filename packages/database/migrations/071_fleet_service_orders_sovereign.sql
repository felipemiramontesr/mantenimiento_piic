-- 🔱 ARCHON SOVEREIGN MIGRATION: 071_fleet_service_orders_sovereign.sql
-- Role: Senior Database Architect
-- Purpose: Implementation of Industrial-Grade Service Order Management
-- Domain: Fleet Operations & Financial Intelligence

SET AUTOCOMMIT = 0;
START TRANSACTION;
SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. DROP LEGACY TABLES ────────────────────────────────────────────────────
DROP TABLE IF EXISTS `fleet_maintenance_logs`;

-- ── 2. SEED: SERVICE TYPE CATALOG ───────────────────────────────────────────
-- Category: SERVICE_TYPE (id range 1100+)
INSERT IGNORE INTO `common_catalogs` (`id`, `category`, `code`, `label`, `is_active`) VALUES
(1101, 'SERVICE_TYPE', 'SRV_PREV', 'Preventivo', 1),
(1102, 'SERVICE_TYPE', 'SRV_CORR', 'Correctivo', 1),
(1103, 'SERVICE_TYPE', 'SRV_GARA', 'Garantía', 1),
(1104, 'SERVICE_TYPE', 'SRV_INSP', 'Inspección', 1),
(1105, 'SERVICE_TYPE', 'SRV_AUX',  'Auxilio Vial', 1),
(1106, 'SERVICE_TYPE', 'SRV_EST',  'Estético', 1);

-- ── 3. SEED: SERVICE STATUS CATALOG ─────────────────────────────────────────
-- Category: SERVICE_STATUS (id range 1200+)
INSERT IGNORE INTO `common_catalogs` (`id`, `category`, `code`, `label`, `is_active`) VALUES
(1201, 'SERVICE_STATUS', 'STS_DRAFT', 'Borrador', 1),
(1202, 'SERVICE_STATUS', 'STS_PROC',  'En Proceso', 1),
(1203, 'SERVICE_STATUS', 'STS_COMP',  'Completado', 1),
(1204, 'SERVICE_STATUS', 'STS_CANC',  'Cancelado', 1),
(1205, 'SERVICE_STATUS', 'STS_WARRA', 'Garantía Activa', 1);

-- ── 4. CREATE SERVICE ORDERS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `fleet_service_orders` (
    `id`                    INT AUTO_INCREMENT PRIMARY KEY,
    `unitId`                VARCHAR(10) NOT NULL COMMENT 'FK to fleet_units',
    `folio`                 VARCHAR(20) NOT NULL UNIQUE COMMENT 'Format: SO-YYYY-XXXX',
    
    -- 🔱 Timing & Usage
    `serviceDate`           DATE NOT NULL,
    `odometerAtService`     DECIMAL(12,2) NOT NULL,
    
    -- 🔱 Relational Governance
    `serviceTypeId`         INT NOT NULL,
    `statusId`              INT NOT NULL DEFAULT 1201, -- Default: Borrador
    `providerId`            INT NOT NULL COMMENT 'FK to common_catalogs(MAINTENANCE_CENTER)',
    
    -- 🔱 Financial Intelligence
    `laborCost`             DECIMAL(12,2) DEFAULT 0.00,
    `partsCost`             DECIMAL(12,2) DEFAULT 0.00,
    `totalCost`             DECIMAL(12,2) AS (`laborCost` + `partsCost`) STORED,
    `invoiceNumber`         VARCHAR(50),
    
    -- 🔱 Operational Details
    `description`           TEXT,
    `technicianName`        VARCHAR(100),
    `images`                JSON COMMENT 'List of S3/Local image keys',
    
    -- 🔱 Audit
    `createdAt`             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt`             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 🔱 Constraints
    FOREIGN KEY (`unitId`) REFERENCES `fleet_units`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`serviceTypeId`) REFERENCES `common_catalogs`(`id`),
    FOREIGN KEY (`statusId`) REFERENCES `common_catalogs`(`id`),
    FOREIGN KEY (`providerId`) REFERENCES `common_catalogs`(`id`),
    
    INDEX `idx_service_unit` (`unitId`),
    INDEX `idx_service_date` (`serviceDate`),
    INDEX `idx_service_folio` (`folio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. UPDATE FLEET_UNITS (Intelligence Sync) ───────────────────────────────
-- Ensure we have the latest reading and date tracked at unit level
ALTER TABLE `fleet_units` 
MODIFY COLUMN `lastServiceDate` DATE NULL,
MODIFY COLUMN `lastServiceReading` DECIMAL(12,2) DEFAULT 0.00;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
-- 🔱 ARCHON MIGRATION 071: SERVICE ORDERS INFRASTRUCTURE READY
