SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 137 — fleet_movements analytical indexes
-- FC: DB_Hardening_Normalization_2026 · FaseD
-- Ensures production has the composite indexes required for OEE analytics and
-- adds the missing created_by_user_id index for user-scoped queries.
-- All ADD INDEX use IF NOT EXISTS (idempotent — safe to re-run on any env).
-- =============================================================================

-- Index 1: composite for analytics queries filtering by unit + type + status
-- Covers: view_fleet_oee_factors, fleet intelligence routes, KPI aggregations
ALTER TABLE fleet_movements
  ADD INDEX IF NOT EXISTS idx_fm_unit_type_status (unit_id, movement_type, status);

-- Index 2: extended KPI coverage — adds temporal range to the composite
-- Covers: MTBF, MTTR, Availability Index calculations that filter by date range
ALTER TABLE fleet_movements
  ADD INDEX IF NOT EXISTS idx_fm_kpi_coverage (unit_id, movement_type, status, end_at, start_at);

-- Index 3: user-scoped queries — missing in all environments
-- Covers: audit trail queries per operator, future user-filtered analytics
ALTER TABLE fleet_movements
  ADD INDEX IF NOT EXISTS idx_fm_created_by_user (created_by_user_id);

-- ─── Verification ─────────────────────────────────────────────────────────────
-- SHOW INDEX FROM fleet_movements;
-- Expected: idx_fm_unit_type_status, idx_fm_kpi_coverage, idx_fm_created_by_user present
