-- =============================================================================
-- Migration: 024 - Add Daily Usage Metric (Doble Barrera Parity)
-- Architecture: Archon Sovereign v37.2.1
-- Goal: Introduces the daily_usage_avg column to power Excel-parity predictions.
-- =============================================================================

ALTER TABLE fleet_units
ADD COLUMN daily_usage_avg DECIMAL(10,2) NULL COMMENT 'Uso Promedio Diario (Km/Hrs) - Core Metric for Prediction Engine'
AFTER odometer;

-- =============================================================================
-- SCRIPT FINALIZADO
-- =============================================================================
