SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 131 — VIM Intelligence Engine: view_fleet_model_failure_patterns
-- FC-DataResilience_NHTSAIntegration · FaseF
-- Aggregates MAINTENANCE/REPAIR financial events + route_incidents
-- grouped by brandId/modelId/year/suite to produce failure patterns with
-- confidence scores for Pre-Recall Interno Archon detection.
-- Idempotent: CREATE OR REPLACE VIEW
-- =============================================================================

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
  -- ── Source 1: Financial transactions (MAINTENANCE + REPAIR) ──────────────
  SELECT
    fu.brandId                                   AS brand_id,
    fu.modelId                                   AS model_id,
    cb.label                                     AS make,
    cm.label                                     AS model,
    fu.year,
    o.suite,
    ft.category                                  AS failure_category,
    COUNT(ft.id)                                 AS occurrence_count,
    COUNT(DISTINCT fu.id)                        AS affected_units,
    ROUND(AVG(fu.odometer), 0)                   AS avg_km_at_failure,
    ROUND(STDDEV(fu.odometer), 0)                AS km_std_dev,
    ROUND(AVG(ft.amount), 2)                     AS avg_cost_mxn,
    MIN(ft.transaction_date)                     AS first_seen_at
  FROM financial_transactions ft
  JOIN fleet_units fu ON ft.unit_id = fu.id
  JOIN owners o ON fu.ownerId = o.id
  LEFT JOIN common_catalogs cb ON fu.brandId = cb.id AND cb.category = 'BRAND'
  LEFT JOIN common_catalogs cm ON fu.modelId = cm.id AND cm.category = 'MODEL'
  WHERE ft.category IN ('MAINTENANCE', 'REPAIR')
  GROUP BY fu.brandId, fu.modelId, fu.year, o.suite, ft.category, cb.label, cm.label

  UNION ALL

  -- ── Source 2: Route incidents (by incident category) ────────────────────
  SELECT
    fu.brandId                                   AS brand_id,
    fu.modelId                                   AS model_id,
    cb.label                                     AS make,
    cm.label                                     AS model,
    fu.year,
    o.suite,
    ri.category                                  AS failure_category,
    COUNT(ri.id)                                 AS occurrence_count,
    COUNT(DISTINCT fu.id)                        AS affected_units,
    ROUND(AVG(fm.start_reading), 0)              AS avg_km_at_failure,
    ROUND(STDDEV(fm.start_reading), 0)           AS km_std_dev,
    NULL                                         AS avg_cost_mxn,
    DATE(MIN(fm.start_at))                       AS first_seen_at
  FROM route_incidents ri
  JOIN fleet_movements fm
    ON ri.route_uuid COLLATE utf8mb4_unicode_ci = fm.uuid
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

-- ─── Verification ─────────────────────────────────────────────────────────────
-- Umbral de señal: confidence_score >= 0.30 AND affected_units >= 3
-- → patrón candidato a "Pre-Recall Interno Archon"
-- SELECT make, model, year, failure_category, affected_units, confidence_score
-- FROM view_fleet_model_failure_patterns
-- WHERE confidence_score >= 0.30
-- ORDER BY confidence_score DESC;
