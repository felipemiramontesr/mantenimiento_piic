-- =============================================================================
-- BACKFILL SCRIPT — Migrate existing maintenance costs to financial_transactions
-- Purpose : Populate the finance ledger with historical data for Phase 1 testing.
-- Scope   : Reads fleet_maintenance_extensions.cost > 0 and inserts AUTO records.
-- Safety  : Idempotent — NOT EXISTS check prevents double inserts per source_uuid.
-- WARNING : This script is for DEV/TESTING only.
--           Before production go-live: truncate financial_transactions and re-seed
--           only verified, validated records (hardening phase).
-- =============================================================================

INSERT INTO financial_transactions
  (uuid, unit_id, category, amount, period, source, source_uuid, notes, created_by, created_at)
SELECT
  UUID(),
  fm.unit_id,
  'MAINTENANCE',
  fme.cost,
  DATE_FORMAT(fme.service_date, '%Y-%m'),
  'AUTO',
  fm.uuid,
  CONCAT('Backfill: ', fme.service_type, ' — ', fme.technician),
  (SELECT MIN(id) FROM users),
  fm.created_at
FROM fleet_maintenance_extensions fme
JOIN fleet_movements fm ON fm.id = fme.movement_id
WHERE fme.cost > 0
  AND fme.cost IS NOT NULL
  AND fm.uuid NOT IN (
    SELECT CONVERT(source_uuid USING utf8mb4) COLLATE utf8mb4_general_ci
    FROM financial_transactions
    WHERE source = 'AUTO' AND source_uuid IS NOT NULL
  );
