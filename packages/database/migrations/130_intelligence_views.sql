SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 130 — Fleet Intelligence KPI Views
-- FC-5: FleetIntelligenceEngine_KPIs — Fase 5A
-- Creates:
--   view_fleet_oee_factors     — quality factor + km/day data per unit (ROUTE movements)
--   view_fleet_fuel_efficiency — Km/L aggregated from routes with fuel data
-- Idempotent: CREATE OR REPLACE VIEW (safe to re-run)
-- =============================================================================

-- ─── 1. view_fleet_oee_factors ───────────────────────────────────────────────
-- Provides the OEE Quality Factor (incident-free routes / total routes)
-- plus total_km and daily_km_avg needed for the Performance Factor calculation.
-- Note: route_incidents uses utf8mb4_general_ci; fleet_movements uses utf8mb4_unicode_ci.
--       COLLATE utf8mb4_unicode_ci on ri.route_uuid resolves the collation mismatch.
CREATE OR REPLACE VIEW `view_fleet_oee_factors` AS
SELECT
  fm.unit_id,
  COUNT(fm.id)                                                                   AS route_count,
  COUNT(DISTINCT ri.route_uuid)                                                  AS routes_with_incidents,
  CASE
    WHEN COUNT(fm.id) = 0 THEN NULL
    ELSE ROUND(1 - (COUNT(DISTINCT ri.route_uuid) / COUNT(fm.id)), 4)
  END                                                                             AS quality_factor,
  COALESCE(SUM(fm.end_reading - fm.start_reading), 0)                           AS total_km,
  DATEDIFF(MAX(fm.end_at), MIN(fm.start_at))                                    AS active_days,
  CASE
    WHEN DATEDIFF(MAX(fm.end_at), MIN(fm.start_at)) > 0
    THEN ROUND(
      SUM(fm.end_reading - fm.start_reading) /
      DATEDIFF(MAX(fm.end_at), MIN(fm.start_at)),
      2
    )
    ELSE NULL
  END                                                                             AS daily_km_avg
FROM fleet_movements fm
LEFT JOIN route_incidents ri
  ON ri.route_uuid COLLATE utf8mb4_unicode_ci = fm.uuid
WHERE fm.movement_type = 'ROUTE'
  AND fm.status = 'COMPLETED'
  AND fm.end_reading IS NOT NULL
GROUP BY fm.unit_id;

-- ─── 2. view_fleet_fuel_efficiency ───────────────────────────────────────────
-- Computes Km/L from COMPLETED ROUTE movements where fuel was loaded.
-- Only counts movements where fuel_liters_loaded > 0 (excludes dry runs).
CREATE OR REPLACE VIEW `view_fleet_fuel_efficiency` AS
SELECT
  unit_id,
  COALESCE(SUM(end_reading - start_reading), 0)                                 AS total_km,
  COALESCE(SUM(fuel_liters_loaded), 0)                                           AS total_liters,
  CASE
    WHEN SUM(fuel_liters_loaded) > 0
    THEN ROUND(SUM(end_reading - start_reading) / SUM(fuel_liters_loaded), 2)
    ELSE NULL
  END                                                                             AS km_per_liter
FROM fleet_movements
WHERE movement_type = 'ROUTE'
  AND status = 'COMPLETED'
  AND end_reading IS NOT NULL
  AND fuel_liters_loaded > 0
GROUP BY unit_id;
