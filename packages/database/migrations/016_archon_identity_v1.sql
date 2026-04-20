-- Archon Identity System: Industrial Roles Evolution
-- Version: 1.0.0
-- Domain: Access Control & Sovereignty

-- 1. PURGE AND RE-SEED ROLES (Atomic Operation)
-- We use a TRUNCATE/INSERT approach for clean ID mapping.
-- Note: Foreign keys will handle user mapping if IDs are maintained or reassigned.
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE role_permissions;
TRUNCATE TABLE roles;

INSERT INTO roles (id, name, description) VALUES 
(0, 'Archon', 'Master system administrator with total emergency bypass'),
(1, 'Administrador', 'Operational manager with full control over fleet, routes, and personnel'),
(2, 'Operador', 'Field execution staff responsible for asset movement and route verification'),
(3, 'Técnico', 'Maintenance specialist in charge of work orders and technical health');

SET FOREIGN_KEY_CHECKS = 1;

-- 2. ENHANCE USERS AUDITABILITY
ALTER TABLE users 
ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER role_id,
ADD INDEX idx_user_role (role_id),
ADD INDEX idx_user_status (is_active);

-- 3. AUDIT LOG (Optional but recommended for identity parity)
CREATE TABLE IF NOT EXISTS system_access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL, -- LOGIN, REGISTER_USER, DELETE_USER
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
