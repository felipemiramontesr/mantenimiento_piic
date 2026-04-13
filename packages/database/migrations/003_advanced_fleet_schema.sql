-- Architecture: Advanced Fleet Management System
-- Version: 5.2.0
-- Domain: PIIC Operational Intelligence

-- 1. DROP EXISTING TABLE TO REBUILD WITH NEW PRIMARY KEYS (Approved by Archon)
DROP TABLE IF EXISTS fleet_maintenance_logs;
DROP TABLE IF EXISTS fleet_route_logs;
DROP TABLE IF EXISTS fleet_units;

-- 2. CREATE CORE UNIT TABLE
CREATE TABLE fleet_units (
    id VARCHAR(10) PRIMARY KEY, -- Primary System ID: FL001, FL002...
    uuid CHAR(36) NOT NULL UNIQUE, -- System Integrity UUID
    tag VARCHAR(50) NOT NULL UNIQUE, -- Internal PIIC Identifier (e.g., PIIC-003)
    unit_name VARCHAR(100) NOT NULL, -- e.g., Toyota Hilux Medio Ambiente
    year INT NOT NULL,
    fuel_type ENUM('Gasolina', 'Diesel') NOT NULL,
    tire_spec VARCHAR(50), -- e.g., 255/70 R15
    tire_brand VARCHAR(100), -- Brand/Model metadata
    unit_type VARCHAR(100) NOT NULL, -- Extracted from Image Catalogs (A/T, M/T...)
    unit_usage VARCHAR(100) NOT NULL, -- Extracted from Image Catalogs (Mina, Ciudad...)
    status ENUM('Disponible', 'En Ruta', 'En Mantenimiento', 'Descontinuada') DEFAULT 'Disponible',
    odometer DECIMAL(12,2) DEFAULT 0.00, -- Odometer in Kilometers
    assigned_operator_id INT, -- Current operator FK
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_operator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. CREATE MAINTENANCE LOG TABLE (Relational History)
CREATE TABLE fleet_maintenance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unit_id VARCHAR(10) NOT NULL,
    service_date DATE NOT NULL,
    odometer_at_service DECIMAL(12,2) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    description TEXT,
    cost DECIMAL(12,2),
    technician VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES fleet_units(id) ON DELETE CASCADE
);

-- 4. CREATE ROUTE LOG TABLE (Operational History)
CREATE TABLE fleet_route_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unit_id VARCHAR(10) NOT NULL,
    operator_id INT NOT NULL,
    origin VARCHAR(100),
    destination VARCHAR(100),
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    start_km DECIMAL(12,2) NOT NULL,
    end_km DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES fleet_units(id) ON DELETE CASCADE,
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE CASCADE
);
