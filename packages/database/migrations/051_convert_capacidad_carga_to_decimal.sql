-- 🔱 ARCHON DATABASE MIGRATION
-- Version: 39.6.9
-- Objective: Convert capacidad_carga to DECIMAL(12,2) for precise kilogram tracking.
-- Consistency: Aligned with PIIC Sovereign Fleet Standards

-- 🛡️ SAFETY CHECK: Verify column exists before modification
SET @dbname = DATABASE();
SET @tablename = 'fleet_units';
SET @columnname = 'capacidad_carga';

-- 🔱 EXECUTION: Transform storage from string to high-precision decimal
ALTER TABLE fleet_units 
MODIFY COLUMN capacidad_carga DECIMAL(12,2) NULL COMMENT 'Load capacity in Kilograms (KG)';

-- 🔱 AUDIT: Verify modification
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname 
AND TABLE_NAME = @tablename 
AND COLUMN_NAME = @columnname;
