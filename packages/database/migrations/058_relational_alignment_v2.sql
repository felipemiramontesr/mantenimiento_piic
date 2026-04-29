-- 🔱 ARCHON RELATIONAL ALIGNMENT v.2.0 (SYMMETRY MASTER)
-- Logic: Converting legacy text columns to relational ID fields.
-- Purpose: 100% Data Integrity and Catalog Synchronization.
-- Architecture: Sovereing Data Infrastructure (v.41.0.0)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. CATALOG SYNC: Adding missing locations to common_catalogs
INSERT INTO common_catalogs (category, code, label, created_at)
SELECT 'LOCATION', 'LOC_MINA', 'Mina', NOW()
FROM (SELECT 1) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM common_catalogs WHERE code = 'LOC_MINA');

INSERT INTO common_catalogs (category, code, label, created_at)
SELECT 'LOCATION', 'LOC_PLANTA', 'Planta', NOW()
FROM (SELECT 1) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM common_catalogs WHERE code = 'LOC_PLANTA');

-- 2. INFRASTRUCTURE: Adding relational ID columns to fleet_units
ALTER TABLE fleet_units 
ADD COLUMN location_id INT DEFAULT NULL AFTER department_id,
ADD COLUMN maintenance_center_id INT DEFAULT NULL AFTER current_reading,
ADD COLUMN engine_type_id INT DEFAULT NULL AFTER color,
ADD COLUMN color_id INT DEFAULT NULL AFTER engine_type_id,
ADD COLUMN insurance_company_id INT DEFAULT NULL AFTER insurance_expiry_date;

-- 3. MASTER MAPPING: Translating text data to Relational IDs

-- Location Mapping
UPDATE fleet_units SET location_id = (SELECT id FROM common_catalogs WHERE code = 'LOC_MINA' LIMIT 1) WHERE sede = 'Mina';
UPDATE fleet_units SET location_id = (SELECT id FROM common_catalogs WHERE code = 'LOC_PLANTA' LIMIT 1) WHERE sede = 'Planta';
UPDATE fleet_units SET location_id = (SELECT id FROM common_catalogs WHERE code = 'LOC_ASZ' LIMIT 1) WHERE sede LIKE '%Arian%';

-- Maintenance Center Mapping
UPDATE fleet_units SET maintenance_center_id = (SELECT id FROM common_catalogs WHERE code = 'MC_PIIC' LIMIT 1) WHERE centro_mantenimiento = 'PIIC';
UPDATE fleet_units SET maintenance_center_id = (SELECT id FROM common_catalogs WHERE code = 'MC_ARCHON_CORE' LIMIT 1) WHERE centro_mantenimiento LIKE '%Archon%';

-- Engine Type Mapping (Matching by exact label)
UPDATE fleet_units f
JOIN common_catalogs c ON f.motor = c.label AND c.category = 'ENGINE_TYPE'
SET f.engine_type_id = c.id;

-- Color Mapping
UPDATE fleet_units SET color_id = (SELECT id FROM common_catalogs WHERE code = 'COL_BLANCO' LIMIT 1) WHERE color LIKE '%Blanco%';
UPDATE fleet_units SET color_id = (SELECT id FROM common_catalogs WHERE code = 'COL_ROJO' LIMIT 1) WHERE color LIKE '%Rojo%';
UPDATE fleet_units SET color_id = (SELECT id FROM common_catalogs WHERE code = 'COL_GRIS' LIMIT 1) WHERE color LIKE '%Gris%';
UPDATE fleet_units SET color_id = (SELECT id FROM common_catalogs WHERE code = 'COL_PLATEADO' LIMIT 1) WHERE color LIKE '%Plata%';
UPDATE fleet_units SET color_id = (SELECT id FROM common_catalogs WHERE code = 'COL_NEGRO' LIMIT 1) WHERE color LIKE '%Negro%';

-- Insurance Company Mapping
UPDATE fleet_units SET insurance_company_id = (SELECT id FROM common_catalogs WHERE code = 'INS_QUALITAS' LIMIT 1) WHERE insurance_company LIKE '%Quálitas%';
UPDATE fleet_units SET insurance_company_id = (SELECT id FROM common_catalogs WHERE code = 'INS_GNP' LIMIT 1) WHERE insurance_company LIKE '%GNP%';
UPDATE fleet_units SET insurance_company_id = (SELECT id FROM common_catalogs WHERE code = 'INS_AXA' LIMIT 1) WHERE insurance_company LIKE '%AXA%';

-- 4. PURGE: Drop legacy text columns
ALTER TABLE fleet_units 
DROP COLUMN sede,
DROP COLUMN centro_mantenimiento,
DROP COLUMN color,
DROP COLUMN motor,
DROP COLUMN insurance_company;

SET FOREIGN_KEY_CHECKS = 1;
