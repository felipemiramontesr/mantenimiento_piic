-- =============================================================================
-- Migration: 027 - Purge Legacy Maintenance Frequency
-- Architecture: Archon Sovereign v37.3.0
-- Goal: Physically removes the VARCHAR ENUM column to enforce Catalog-only logic.
-- =============================================================================

ALTER TABLE fleet_units DROP COLUMN maintenance_frequency;

-- =============================================================================
-- SCRIPT FINALIZADO
-- =============================================================================
