-- 🔱 Archon Forensic Logistics Expansion (v.75.0.0)
-- Purge and Expand: Integrating Fuel Logs, Tire Pressure and Maintenance Checklists

-- 1. EXPAND FLEET_ROUTES (The Forensic Log)
ALTER TABLE fleet_routes 
ADD COLUMN fuel_level_start DECIMAL(5,2) DEFAULT 0,
ADD COLUMN fuel_level_end DECIMAL(5,2) DEFAULT 0,
ADD COLUMN additives_check BOOLEAN DEFAULT FALSE,
ADD COLUMN tire_pressure_json JSON DEFAULT NULL,
ADD COLUMN checklist_json JSON DEFAULT NULL;

-- 2. EXPAND FLEET_UNITS (The Live State)
ALTER TABLE fleet_units 
ADD COLUMN lastFuelLevel DECIMAL(5,2) DEFAULT 100;

-- 3. DATA RECONCILIATION
-- Set industrial defaults for existing routes
UPDATE fleet_routes SET fuel_level_start = 100 WHERE fuel_level_start = 0;
