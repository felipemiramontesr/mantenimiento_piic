-- =============================================================================
-- Migration: 013 - Dynamic Specification Catalogs
-- Architecture: Archon Collective Relational Evolution
-- Version: 21.0.0.0
-- Author: ArchonCore
-- Description: Migrates technical ENUMs to the Sovereign Catalog system.
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. SEED: DRIVE TYPES (TRACCIÓN) ──────────────────────────────────────────
INSERT INTO common_catalogs (category, code, label) VALUES 
('DRIVE_TYPE', 'DR_4X2',   '4x2'),
('DRIVE_TYPE', 'DR_4X4',   '4x4'),
('DRIVE_TYPE', 'DR_DOUBLE', 'Doble Tracción'),
('DRIVE_TYPE', 'DR_AWD',   'AWD'),
('DRIVE_TYPE', 'DR_ORUGA', 'Oruga'),
('DRIVE_TYPE', 'DR_NA',    'No Aplica');

-- ── 2. SEED: TRANSMISSION TYPES ──────────────────────────────────────────────
INSERT INTO common_catalogs (category, code, label) VALUES 
('TRANSMISSION', 'TR_AUTO',  'Automática'),
('TRANSMISSION', 'TR_MAN',   'Estándar (Manual)'),
('TRANSMISSION', 'TR_CVT',   'CVT'),
('TRANSMISSION', 'TR_HIDRO', 'Hidrostática'),
('TRANSMISSION', 'TR_NA',    'No Aplica');

-- ── 3. PREPARE fleet_units FOR RELATIONAL TRANSITION ─────────────────────────
ALTER TABLE fleet_units
ADD COLUMN asset_type_id INT AFTER asset_type,
ADD COLUMN fuel_type_id INT AFTER fuel_type,
ADD COLUMN traccion_id INT AFTER traccion,
ADD COLUMN transmision_id INT AFTER transmision;

-- ── 4. DATA MIGRATION: MAP STRINGS TO IDs ────────────────────────────────────

-- Map Asset Types
UPDATE fleet_units f
SET f.asset_type_id = (SELECT id FROM common_catalogs WHERE category = 'ASSET_TYPE' AND label = f.asset_type);

-- Map Fuel Types
UPDATE fleet_units f
SET f.fuel_type_id = (SELECT id FROM common_catalogs WHERE category = 'FUEL' AND label = f.fuel_type);

-- Map Drive Types
UPDATE fleet_units f
SET f.traccion_id = (SELECT id FROM common_catalogs WHERE category = 'DRIVE_TYPE' AND label = f.traccion);

-- Map Transmission Types
UPDATE fleet_units f
SET f.transmision_id = (SELECT id FROM common_catalogs WHERE category = 'TRANSMISSION' AND label = f.transmision);

-- ── 5. CLEANUP: REMOVE OLD ENUM COLUMNS ──────────────────────────────────────
-- We drop the old columns to enforce the new relational pattern.
ALTER TABLE fleet_units
DROP COLUMN asset_type,
DROP COLUMN fuel_type,
DROP COLUMN traccion,
DROP COLUMN transmision;

-- ── 6. CONSTRAINTS: LOCK THE ARCHITECTURE ─────────────────────────────────────
ALTER TABLE fleet_units
ADD CONSTRAINT fk_unit_asset_type FOREIGN KEY (asset_type_id) REFERENCES common_catalogs(id),
ADD CONSTRAINT fk_unit_fuel_type FOREIGN KEY (fuel_type_id) REFERENCES common_catalogs(id),
ADD CONSTRAINT fk_unit_traccion FOREIGN KEY (traccion_id) REFERENCES common_catalogs(id),
ADD CONSTRAINT fk_unit_transmision FOREIGN KEY (transmision_id) REFERENCES common_catalogs(id);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- MIGRATION COMPLETE: Dynamic Catalog Architecture v.21.0.0.0
-- =============================================================================
