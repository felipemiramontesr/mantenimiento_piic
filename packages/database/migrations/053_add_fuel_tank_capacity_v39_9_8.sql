-- 🔱 ARCHON FUEL INTELLIGENCE v.39.9.8
-- Purpose: Add fuel tank capacity column to enable KM/L and fuel cost analytics.

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE fleet_units ADD COLUMN fuel_tank_capacity DECIMAL(10,2) DEFAULT 0.00 AFTER capacity_carga;

-- Seed initial values for the 23 units (Estimates for Demonstration)
UPDATE fleet_units SET fuel_tank_capacity = 80.00 WHERE id LIKE '%Hilux%' OR id LIKE '%L200%';
UPDATE fleet_units SET fuel_tank_capacity = 75.00 WHERE id LIKE '%Frontier%' OR id LIKE '%NP 300%';
UPDATE fleet_units SET fuel_tank_capacity = 120.00 WHERE id LIKE '%Ram 4000%';
UPDATE fleet_units SET fuel_tank_capacity = 50.00 WHERE id LIKE '%Versa%' OR id LIKE '%Aveo%' OR id LIKE '%Rio%' OR id LIKE '%Yaris%';

SET FOREIGN_KEY_CHECKS = 1;
