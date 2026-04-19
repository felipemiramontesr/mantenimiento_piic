-- =============================================================================
-- Migration: 014 - Fleet Predictive Maintenance Precision (CLEAN)
-- Architecture: Archon Predictive Engine v.28.0.1
-- Description: Adds remaining predictive config fields. 
-- Note: last_service_date and last_service_reading already exist from Migration 007.
-- =============================================================================

ALTER TABLE fleet_units
ADD COLUMN avg_daily_km DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Spreadsheet: Km Prom dia',
ADD COLUMN maint_interval_days INT DEFAULT 180 COMMENT 'Spreadsheet: Int d',
ADD COLUMN maint_interval_km DECIMAL(12,2) DEFAULT 10000.00 COMMENT 'Spreadsheet: Int servi';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
