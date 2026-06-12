-- =============================================================================
-- Migration: 083 — KPI Performance Indexes
-- Purpose: Covering indexes for MTBF, MTTR, Availability and Backlog queries
--          executed by FleetIntelligenceEngine.computeKpis()
-- =============================================================================

-- ─── fleet_movements ──────────────────────────────────────────────────────────
-- Existing: idx_fm_unit_type_status (unit_id, movement_type, status)
-- Missing:  end_at and start_at columns → forces row fetch after index lookup
--
-- This covering index allows MTTR, MTBF and BCK queries to resolve entirely
-- from the index without touching the clustered row:
--   • MTTR: WHERE (unit_id, movement_type, status) + reads start_at, end_at
--   • MTBF: same filter + LAG window ordered by start_at
--   • BCK:  same filter + ROW_NUMBER ordered by end_at DESC → id

ALTER TABLE fleet_movements
  ADD INDEX idx_fm_kpi_coverage (unit_id, movement_type, status, end_at, start_at);

-- ─── fleet_maintenance_details ────────────────────────────────────────────────
-- Existing: PK (maintenance_id, task_code) — covers join by maintenance_id
-- Missing:  status_code column in index → BCK query scans all tasks per event
--           to filter DEFERRED rows
--
-- This index allows the BCK LEFT JOIN to skip non-DEFERRED rows at index level:
--   LEFT JOIN fleet_maintenance_details fmd
--     ON fmd.maintenance_id = ranked.id AND fmd.status_code = 'DEFERRED'

ALTER TABLE fleet_maintenance_details
  ADD INDEX idx_fmd_status_code (maintenance_id, status_code);
