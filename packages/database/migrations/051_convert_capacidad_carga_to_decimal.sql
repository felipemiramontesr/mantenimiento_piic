-- 🔱 ARCHON DATABASE MIGRATION
-- Version: 39.6.9.1 (Host-Safe Version)
-- Objective: Convert capacidad_carga to DECIMAL(12,2) for precise kilogram tracking.

-- 🔱 EXECUTION: Transform storage from string to high-precision decimal
-- Note: Simplified for shared hosting environments (Hostinger/cPanel)
ALTER TABLE fleet_units 
MODIFY COLUMN capacidad_carga DECIMAL(12,2) NULL COMMENT 'Load capacity in Kilograms (KG)';
