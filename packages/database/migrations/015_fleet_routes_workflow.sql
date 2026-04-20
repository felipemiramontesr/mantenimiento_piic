-- Archon Operational Intelligence: Routes Workflow Evolution
-- Version: 1.1.2
-- Domain: PIIC Infrastructure

-- 1. EXTEND FLEET UNITS STATUS (Allowing 'Asignada')
-- Note: MySQL 8+ handles this without full table rebuild if column is identical but with extra enum value.
ALTER TABLE fleet_units 
MODIFY COLUMN status ENUM('Disponible', 'En Ruta', 'En Mantenimiento', 'Descontinuada', 'Asignada') DEFAULT 'Disponible';

-- 2. ENHANCE ROUTE LOGS (Status Tracking & Mission Briefing)
ALTER TABLE fleet_route_logs
ADD COLUMN status ENUM('ASSIGNED', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'ASSIGNED' AFTER operator_id,
ADD COLUMN description TEXT AFTER destination,
MODIFY COLUMN start_time DATETIME NULL,
MODIFY COLUMN start_km DECIMAL(12,2) NULL;

-- 3. CREATE CENTRALIZED NOTIFICATION HUB
CREATE TABLE IF NOT EXISTS system_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Target user
    type ENUM('ROUTE_ASSIGNED', 'ROUTE_STARTED', 'ROUTE_COMPLETED', 'MAINTENANCE_ALERT', 'SYSTEM') NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    metadata JSON, -- Extra context (unitId, routeId, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. VIEW: ACTIVE ROUTES MONITOR (Optimized for Dashboard Feed)
CREATE OR REPLACE VIEW view_active_routes AS
SELECT 
    r.id AS route_id,
    r.unit_id,
    u.unit_name,
    r.operator_id,
    usr.username AS operator_name,
    r.destination,
    r.description AS mission_briefing,
    r.status,
    r.start_time
FROM fleet_route_logs r
JOIN fleet_units u ON r.unit_id = u.id
JOIN users usr ON r.operator_id = usr.id
WHERE r.status IN ('ASSIGNED', 'IN_PROGRESS');
