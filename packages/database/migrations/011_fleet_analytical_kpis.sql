-- =============================================================================
-- Migration: 011 - Archon Analytical Intelligence (KPIs)
-- Architecture: PIIC Sovereign Analytical Engine
-- Version: 20.0.0.0
-- Author: ArchonCore
-- Description: Adds analytical infrastructure for MTBF, MTTR, Availability and Backlog.
-- =============================================================================

-- 1. ENHANCE fleet_units WITH ANALYTICAL CACHE
-- Purpose: Store computed KPIs for high-performance table rendering.
ALTER TABLE fleet_units
ADD COLUMN availability_index DECIMAL(5,2) DEFAULT 100.00 COMMENT 'Percentage of time operational',
ADD COLUMN mtbf_hours DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Mean Time Between Failures (Hours)',
ADD COLUMN mttr_hours DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Mean Time To Repair (Hours)',
ADD COLUMN backlog_count INT DEFAULT 0 COMMENT 'Number of pending maintenance tasks';

-- 2. ENHANCE fleet_maintenance_logs WITH DOWNTIME TRACKING
-- Purpose: Provide raw data for MTTR and Availability calculations.
ALTER TABLE fleet_maintenance_logs
ADD COLUMN downtime_start DATETIME NULL COMMENT 'Time when asset was stopped for service',
ADD COLUMN downtime_end DATETIME NULL COMMENT 'Time when asset was released back to operations',
ADD COLUMN service_category ENUM('Preventivo', 'Correctivo', 'Predictivo', 'Inspección') DEFAULT 'Preventivo' COMMENT 'Category for MTBF filtering',
ADD COLUMN is_failure BOOLEAN DEFAULT FALSE COMMENT 'Explicit flag for unscheduled breakdowns (MTBF trigger)';

-- 3. CREATE MAINTENANCE SCHEDULES TABLE
-- Purpose: Track "Backlog" by comparing planned vs actual maintenance.
CREATE TABLE fleet_maintenance_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unit_id VARCHAR(10) NOT NULL,
    scheduled_date DATE NOT NULL,
    task_description VARCHAR(255) NOT NULL,
    priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
    status ENUM('Pending', 'Completed', 'Overdue', 'Cancelled') DEFAULT 'Pending',
    completion_date DATE NULL,
    maintenance_log_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES fleet_units(id) ON DELETE CASCADE,
    FOREIGN KEY (maintenance_log_id) REFERENCES fleet_maintenance_logs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
