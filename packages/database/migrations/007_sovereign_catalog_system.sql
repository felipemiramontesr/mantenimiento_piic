-- =============================================================================
-- Migration: 007 - Sovereign Catalog System & Dual-Trigger Intelligence
-- Architecture: Archon Collective v.18.0.0
-- Goal: Decouple metadata from schemas and enable predictive maintenance alerts.
-- =============================================================================

-- ── 1. CORE CATALOG TABLE ───────────────────────────────────────────────────
CREATE TABLE common_catalogs (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    category      VARCHAR(50) NOT NULL COMMENT 'Group: ASSET_TYPE, BRAND, MODEL, FREQ_TIME, FREQ_USAGE...',
    parent_id     INT DEFAULT NULL COMMENT 'For hierarchical relationships (e.g., Brand -> Model)',
    code          VARCHAR(50) UNIQUE NOT NULL COMMENT 'Identifier: V_TOYOTA, U_5K_KM',
    label         VARCHAR(100) NOT NULL COMMENT 'Display Name: Toyota, 5,000 KM',
    numeric_value DECIMAL(10,2) DEFAULT NULL COMMENT 'Numeric payload for math (e.g., 5000)',
    unit          VARCHAR(10) DEFAULT NULL COMMENT 'Measurement unit (km, hrs, days)',
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    FOREIGN KEY (parent_id) REFERENCES common_catalogs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. SEED: ROOT ASSET TYPES ────────────────────────────────────────────────
INSERT INTO common_catalogs (category, code, label) VALUES 
('ASSET_TYPE', 'AT_VEH', 'Vehiculo'),
('ASSET_TYPE', 'AT_MAQ', 'Maquinaria'),
('ASSET_TYPE', 'AT_HER', 'Herramienta');

-- ── 3. SEED: MAINTENANCE FREQUENCIES (TIME) ──────────────────────────────────
-- We use days as the base unit for calculation
INSERT INTO common_catalogs (category, code, label, numeric_value, unit) VALUES 
('FREQ_TIME', 'T_DIARIA',   'Diaria',    1,    'days'),
('FREQ_TIME', 'T_SEMANAL',  'Semanal',   7,    'days'),
('FREQ_TIME', 'T_MENSUAL',  'Mensual',   30,   'days'),
('FREQ_TIME', 'T_TRIMEST',  'Trimestral', 90,   'days'),
('FREQ_TIME', 'T_BIMEST',   'Bimestral',  60,   'days'),
('FREQ_TIME', 'T_SEMEST',   'Semestral',  180,  'days'),
('FREQ_TIME', 'T_ANUAL',    'Anual',     365,  'days');

-- ── 4. SEED: MAINTENANCE FREQUENCIES (USAGE/DISTANCE) ────────────────────────
-- New Predictive Dual-Trigger Gatillos
INSERT INTO common_catalogs (category, code, label, numeric_value, unit) VALUES 
('FREQ_USAGE', 'U_5K_KM',   '5,000 KM',   5000,  'km'),
('FREQ_USAGE', 'U_10K_KM',  '10,000 KM',  10000, 'km'),
('FREQ_USAGE', 'U_15K_KM',  '15,000 KM',  15000, 'km'),
('FREQ_USAGE', 'U_250_H',   '250 HRS',    250,   'hrs'),
('FREQ_USAGE', 'U_500_H',   '500 HRS',    500,   'hrs'),
('FREQ_USAGE', 'U_1000_H',  '1,000 HRS',  1000,  'hrs');

-- ── 5. SEED: FUEL TYPES ──────────────────────────────────────────────────────
INSERT INTO common_catalogs (category, code, label) VALUES 
('FUEL', 'F_GAS',  'Gasolina'),
('FUEL', 'F_DSL',  'Diesel'),
('FUEL', 'F_ELE',  'Eléctrico'),
('FUEL', 'F_HYB',  'Híbrido'),
('FUEL', 'F_NA',   'No Aplica');

-- ── 6. SEED: BRANDS & MODELS (HIERARCHICAL) ──────────────────────────────────
-- Placeholder for Tier 1 Industrial Assets
-- Note: parent_id 1 = Vehiculo, 2 = Maquinaria, 3 = Herramienta (based on INSERT order)

-- VEHICLE BRANDS
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 1, 'B_TOYOTA', 'Toyota'),
('BRAND', 1, 'B_NISSAN', 'Nissan'),
('BRAND', 1, 'B_FORD',   'Ford');

-- VEHICLE MODELS (Toyota)
-- parent_id 20 = Toyota (approx, depends on execution)
-- In a real script, we would use SELECT to find the parent_id
SET @toyota_id = (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA');
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @toyota_id, 'M_HILUX',  'Hilux'),
('MODEL', @toyota_id, 'M_TACOMA', 'Tacoma'),
('MODEL', @toyota_id, 'M_HIACE',  'Hiace');

-- MACHINERY BRANDS
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('BRAND', 2, 'B_CAT',    'Caterpillar'),
('BRAND', 2, 'B_KOM',    'Komatsu');

SET @cat_id = (SELECT id FROM common_catalogs WHERE code = 'B_B_CAT'); -- fixed typo below
-- Updating to use the correct SELECT for CAT
SET @cat_id = (SELECT id FROM common_catalogs WHERE code = 'B_CAT');
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @cat_id, 'M_320L', 'Excavadora 320L'),
('MODEL', @cat_id, 'M_416F', 'Retroexcavadora 416F');

-- ── 7. REFACTOR: FLEET_UNITS EVOLUTION ───────────────────────────────────────
-- We expand the units table to hold the new relational intelligence.
ALTER TABLE fleet_units 
ADD COLUMN maintenance_time_freq_id INT AFTER maintenance_frequency,
ADD COLUMN maintenance_usage_freq_id INT AFTER maintenance_time_freq_id,
ADD COLUMN last_service_date DATE AFTER maintenance_usage_freq_id,
ADD COLUMN last_service_reading DECIMAL(12,2) DEFAULT 0.00 AFTER last_service_date,
ADD COLUMN current_reading DECIMAL(12,2) DEFAULT 0.00 AFTER last_service_reading;

-- Integrity constraints for the new architecture
ALTER TABLE fleet_units 
ADD CONSTRAINT fk_unit_time_freq FOREIGN KEY (maintenance_time_freq_id) REFERENCES common_catalogs(id),
ADD CONSTRAINT fk_unit_usage_freq FOREIGN KEY (maintenance_usage_freq_id) REFERENCES common_catalogs(id);

-- ── 7. DATA MIGRATION LOGIC (Placeholder) ────────────────────────────────────
-- Note: In a production environment, we would run UPDATEs to map existing 
-- VARCHAR maintenance_frequency values to common_catalogs entries.
-- Since this is a fresh F1 Go, we assume subsequent registrations will use the IDs.

-- =============================================================================
-- MIGRATION COMPLETE: PHASE 1 READY for PHPMYADMIN
-- =============================================================================
