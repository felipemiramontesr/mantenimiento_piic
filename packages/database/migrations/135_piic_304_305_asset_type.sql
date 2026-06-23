SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 135 — Correct assetTypeId for PIIC-304 and PIIC-305
-- FC: DB_Hardening_Normalization_2026 · FaseB
-- PIIC-304 and PIIC-305 are industrial equipment units (brandId=23 modelId=525
-- year=2020) seeded for VIM Intelligence Engine in FaseA DataResilience.
-- Migration 133 defaulted all NULL/0 assetTypeIds to 1 (VEHICLE), incorrectly
-- classifying these units. They must be 3 (EQUIPMENT) so the UI hides placa
-- and circulationCardNumber fields per the asset_type_fields configuration.
-- Idempotent: UPDATE only affects rows where assetTypeId != 3.
-- =============================================================================

UPDATE fleet_units
SET assetTypeId = 3
WHERE id IN ('PIIC-304', 'PIIC-305')
  AND assetTypeId != 3;

-- ─── Verification ─────────────────────────────────────────────────────────────
-- SELECT id, assetTypeId FROM fleet_units WHERE id IN ('PIIC-304','PIIC-305');
-- Expected: both rows show assetTypeId = 3
