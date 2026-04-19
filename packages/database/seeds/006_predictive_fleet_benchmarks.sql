-- =============================================================================
-- Seed: 006 - Predictive Fleet Benchmarks (Spreadsheet Parity)
-- Architecture: Archon Predictive Dataset (v.28.0.0)
-- Description: Injects 24 units with precise maintenance strategy data from spreadsheet.
-- Note: Fixed column name to last_service_reading for system parity.
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. UPDATE MASTER FLEET WITH PREDICTIVE CONFIG ───────────────────────────

-- ASM-002 Hilux (Medio Ambiente)
UPDATE fleet_units SET 
  maint_interval_days = 180,
  maint_interval_km = 10000,
  avg_daily_km = 35.9,
  odometer = 120568,
  last_service_reading = 119728,
  last_service_date = '2026-03-09'
WHERE id = 'ASM-002';

-- ASM-006 Frontier (Medio Ambiente)
UPDATE fleet_units SET 
  maint_interval_days = 180,
  maint_interval_km = 10000,
  avg_daily_km = 45.0,
  odometer = 357706,
  last_service_reading = 356944,
  last_service_date = '2026-03-11'
WHERE id = 'ASM-006';

-- ASM-015 Yaris (Administración) - OVERDUE
UPDATE fleet_units SET 
  maint_interval_days = 180,
  maint_interval_km = 10000,
  avg_daily_km = 210.3,
  odometer = 160522,
  last_service_reading = 150000,
  last_service_date = '2025-12-29'
WHERE id = 'ASM-015';

-- ASM-024 Frision T8 (Seguridad) - OVERDUE
UPDATE fleet_units SET 
  maint_interval_days = 180,
  maint_interval_km = 5000,
  avg_daily_km = 244.7,
  odometer = 192568,
  last_service_reading = 186819,
  last_service_date = '2026-03-11'
WHERE id = 'ASM-024';

-- ASM-026 Hilux (Geología) - OVERDUE
UPDATE fleet_units SET 
  maint_interval_days = 90,
  maint_interval_km = 5000,
  avg_daily_km = 212.1,
  odometer = 67340,
  last_service_reading = 61238,
  last_service_date = '2026-02-27'
WHERE id = 'ASM-026';

-- Standard defaults for others
UPDATE fleet_units SET
  maint_interval_days = 180,
  maint_interval_km = 10000,
  avg_daily_km = 150.0,
  last_service_reading = odometer - (odometer % 10000),
  last_service_date = DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
WHERE maint_interval_days IS NULL;

SET FOREIGN_KEY_CHECKS = 1;
