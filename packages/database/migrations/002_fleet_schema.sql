-- Architecture: Fleet Administration Core
-- Domain: PIIC System

CREATE TABLE IF NOT EXISTS fleet_units (
  id VARCHAR(36) PRIMARY KEY,
  tag VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  assigned_to INT,
  last_maintenance_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed Minimal Data
INSERT INTO fleet_units (id, tag, type, status, assigned_to) VALUES 
('f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', 'PIIC-001', 'Camioneta 4x4', 'ACTIVE', 1),
('f2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', 'PIIC-002', 'Retroexcavadora', 'MAINTENANCE', NULL);
