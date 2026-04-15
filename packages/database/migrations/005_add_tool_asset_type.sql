-- =============================================================================
-- Migration: 005 - Expansion of Asset Classification
-- Architecture: PIIC Sovereign Fleet Management System
-- Goal: Add 'Herramienta' as a valid root asset_type
-- =============================================================================

-- 1. Modify the asset_type ENUM to include 'Herramienta'
-- We preserve existing values ('Vehiculo', 'Maquinaria')
ALTER TABLE fleet_units 
MODIFY COLUMN asset_type ENUM('Vehiculo', 'Maquinaria', 'Herramienta') NOT NULL 
COMMENT 'Root classifier. Controls Marca and Modelo catalogs.';

-- 2. Verify change
-- SHOW COLUMNS FROM fleet_units LIKE 'asset_type';
