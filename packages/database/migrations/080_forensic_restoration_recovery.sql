-- 🔱 ARCHON FORENSIC SYSTEM RECOVERY
-- Restoration of missing operational logs tables

SET FOREIGN_KEY_CHECKS = 0;

-- 0. FIX FLEET ROUTES STRUCTURE
-- We assume id and uuid already exist. We just ensure they have the correct indexes.
ALTER TABLE fleet_routes CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
-- Using CREATE INDEX IF NOT EXISTS (MariaDB 10.1+)
CREATE UNIQUE INDEX IF NOT EXISTS uq_route_uuid ON fleet_routes(uuid);
CREATE INDEX IF NOT EXISTS idx_route_unit ON fleet_routes(unit_id);
CREATE INDEX IF NOT EXISTS idx_route_driver ON fleet_routes(driver_id);

-- 1. CREATE ROUTE INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS route_incidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) DEFAULT (UUID()),
    route_uuid CHAR(36) NOT NULL,
    category ENUM('MECANICA', 'SINIESTRO', 'LEGAL', 'OPERATIVA', 'OTRA') NOT NULL,
    description TEXT NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW',
    evidence_image LONGTEXT, -- Base64
    status ENUM('OPEN', 'RESOLVED', 'DISCARDED') DEFAULT 'OPEN',
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    resolved_by INT NULL,
    resolution_notes TEXT NULL,
    CONSTRAINT fk_incident_route FOREIGN KEY (route_uuid) REFERENCES fleet_routes(uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. CREATE UNIT ACTIVITY LOGS TABLE (The Forensic Journal)
CREATE TABLE IF NOT EXISTS unit_activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) DEFAULT (UUID()),
    unit_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- ROUTE_START, ROUTE_FINISH, MAINTENANCE_START, etc.
    reference_id VARCHAR(100), -- UUID of the route, maintenance or incident
    reading_before DECIMAL(12,2),
    reading_after DECIMAL(12,2),
    status_before VARCHAR(20),
    status_after VARCHAR(20),
    description TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_unit FOREIGN KEY (unit_id) REFERENCES fleet_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. ENSURE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_route_incidents_route ON route_incidents(route_uuid);
CREATE INDEX IF NOT EXISTS idx_unit_activity_logs_unit ON unit_activity_logs(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_activity_logs_event ON unit_activity_logs(event_type);

SET FOREIGN_KEY_CHECKS = 1;
