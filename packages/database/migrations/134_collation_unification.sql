SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 134 — Collation Unification (utf8mb4_general_ci → utf8mb4_unicode_ci)
-- FC: DB_Hardening_Normalization_2026 · FaseA
-- Strategy: Two-pass approach.
--   Pass A (universal): MODIFY COLUMN on non-FK string columns causing view collation
--     mismatch — works on MariaDB 10.4+ and MySQL 5.7/8.0 without FK issues.
--   Pass B (production phpMyAdmin only): Full table CONVERT with FK_CHECKS=0
--     for remaining general_ci tables. MySQL 5.7 (Hostinger) bypasses FK constraints
--     correctly. Run Pass B manually on Hostinger after Pass A.
-- Views are rewritten in Pass A to remove CONVERT()/COLLATE workarounds.
-- Idempotent: MODIFY COLUMN and CREATE OR REPLACE VIEW are safe to re-run.
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASS A — Targeted column fixes + view rewrites (all environments)
-- ═══════════════════════════════════════════════════════════════════════════════

-- financial_transactions.category: ENUM, not a FK column → safe MODIFY
-- Resolves UNION collation mismatch in view_fleet_model_failure_patterns
-- (ft.category general_ci UNION ri.category unicode_ci → both unicode_ci)
ALTER TABLE financial_transactions
  MODIFY COLUMN category
  ENUM('LEASE','INSURANCE','MAINTENANCE','FUEL','TIRE','FINE','REPAIR','OTHER')
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- ─── Rewrite view_fleet_oee_factors (remove COLLATE workaround) ──────────────

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
LEFT JOIN route_incidents ri ON ri.route_uuid = fm.uuid
WHERE fm.movement_type = 'ROUTE'
  AND fm.status = 'COMPLETED'
  AND fm.end_reading IS NOT NULL
GROUP BY fm.unit_id;

-- ─── Rewrite view_fleet_model_failure_patterns (remove all CONVERT/COLLATE) ──

CREATE OR REPLACE VIEW view_fleet_model_failure_patterns AS
SELECT
  p.brand_id,
  p.model_id,
  p.make,
  p.model,
  p.year,
  p.suite,
  p.failure_category,
  p.occurrence_count,
  p.affected_units,
  p.avg_km_at_failure,
  p.km_std_dev,
  p.avg_cost_mxn,
  p.first_seen_at,
  ROUND(p.affected_units / ut.total_units, 4) AS confidence_score
FROM (
  SELECT
    fu.brandId                    AS brand_id,
    fu.modelId                    AS model_id,
    cb.label                      AS make,
    cm.label                      AS model,
    fu.year,
    o.suite                       AS suite,
    ft.category                   AS failure_category,
    COUNT(ft.id)                  AS occurrence_count,
    COUNT(DISTINCT fu.id)         AS affected_units,
    ROUND(AVG(fu.odometer), 0)    AS avg_km_at_failure,
    ROUND(STDDEV(fu.odometer), 0) AS km_std_dev,
    ROUND(AVG(ft.amount), 2)      AS avg_cost_mxn,
    MIN(ft.period)                AS first_seen_at
  FROM financial_transactions ft
  JOIN fleet_units fu ON ft.unit_id = fu.id
  JOIN owners o ON fu.ownerId = o.id
  LEFT JOIN common_catalogs cb ON fu.brandId = cb.id AND cb.category = 'BRAND'
  LEFT JOIN common_catalogs cm ON fu.modelId = cm.id AND cm.category = 'MODEL'
  WHERE ft.category IN ('MAINTENANCE', 'REPAIR')
  GROUP BY fu.brandId, fu.modelId, fu.year, o.suite, ft.category, cb.label, cm.label

  UNION ALL

  SELECT
    fu.brandId,
    fu.modelId,
    cb.label,
    cm.label,
    fu.year,
    o.suite,
    ri.category,
    COUNT(ri.id),
    COUNT(DISTINCT fu.id),
    ROUND(AVG(fm.start_reading), 0),
    ROUND(STDDEV(fm.start_reading), 0),
    NULL,
    DATE(MIN(fm.start_at))
  FROM route_incidents ri
  JOIN fleet_movements fm ON ri.route_uuid = fm.uuid
  JOIN fleet_units fu ON fm.unit_id = fu.id
  JOIN owners o ON fu.ownerId = o.id
  LEFT JOIN common_catalogs cb ON fu.brandId = cb.id AND cb.category = 'BRAND'
  LEFT JOIN common_catalogs cm ON fu.modelId = cm.id AND cm.category = 'MODEL'
  GROUP BY fu.brandId, fu.modelId, fu.year, o.suite, ri.category, cb.label, cm.label
) p
JOIN (
  SELECT brandId, modelId, year, COUNT(*) AS total_units
  FROM fleet_units
  GROUP BY brandId, modelId, year
) ut ON p.brand_id = ut.brandId AND p.model_id = ut.modelId AND p.year = ut.year;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PASS B — Full table CONVERT (Hostinger production phpMyAdmin only)
-- MySQL 5.7 respects FOREIGN_KEY_CHECKS=0 for collation-changing ALTERs.
-- DO NOT run on MariaDB (local dev) — hits FK constraint blocking bug.
-- Apply manually after deploying Pass A.
-- ═══════════════════════════════════════════════════════════════════════════════

-- SET FOREIGN_KEY_CHECKS = 0;
-- ALTER TABLE fleet_units             CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE fleet_movements         CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE fleet_route_extensions  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE financial_transactions  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE unit_activity_logs      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE upa_work_orders         CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE upa_work_order_tasks    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE fleet_maintenance_logs  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE fleet_maintenance_details CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE fleet_unit_recalls      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE route_incidents         CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE users                   CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE roles                   CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE permissions             CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE user_roles              CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE maintenance_tasks       CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE maintenance_plan_tasks  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE maintenance_brand_rules CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE maintenance_task_statuses CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ALTER TABLE upa_task_catalog        CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- SET FOREIGN_KEY_CHECKS = 1;
