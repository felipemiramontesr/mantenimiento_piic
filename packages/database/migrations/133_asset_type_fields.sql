SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 133 — asset_type_fields + FK on fleet_units
-- FC-AssetType_ConditionalFields · FaseA
-- Stores which fields are HIDDEN (visible=0) per asset type.
-- Absence of a row for a field means visible=true (default: show all).
-- VEHICLE (1) has no hidden rows — shows everything by default.
-- Idempotent: CREATE TABLE IF NOT EXISTS + INSERT IGNORE
-- FK: must run AFTER migration 132.
-- =============================================================================

CREATE TABLE IF NOT EXISTS asset_type_fields (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  asset_type_id INT UNSIGNED NOT NULL,
  field_name    VARCHAR(64)  NOT NULL,
  visible       TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_atf_type_field (asset_type_id, field_name),
  CONSTRAINT fk_atf_asset_type
    FOREIGN KEY (asset_type_id) REFERENCES catalog_asset_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Seed: hidden fields per type (visible=0) ────────────────────────────────
-- VEHICLE (1): no rows — all fields visible by default

-- MOTORCYCLE (2): hides only circulationCardNumber
INSERT IGNORE INTO asset_type_fields (asset_type_id, field_name, visible) VALUES
(2, 'circulationCardNumber', 0);

-- EQUIPMENT (3): hides vehicular identity fields
INSERT IGNORE INTO asset_type_fields (asset_type_id, field_name, visible) VALUES
(3, 'placa',                 0),
(3, 'circulationCardNumber', 0),
(3, 'insurancePolicyNumber', 0),
(3, 'insuranceExpiryDate',   0),
(3, 'vencimientoVerificacion', 0);

-- TRAILER (4): hides placa, circulationCardNumber, vencimientoVerificacion
INSERT IGNORE INTO asset_type_fields (asset_type_id, field_name, visible) VALUES
(4, 'placa',                   0),
(4, 'circulationCardNumber',   0),
(4, 'vencimientoVerificacion', 0);

-- ─── Ensure all fleet_units have a valid assetTypeId ─────────────────────────
UPDATE fleet_units SET assetTypeId = 1 WHERE assetTypeId IS NULL OR assetTypeId = 0;

-- ─── Add FK from fleet_units.assetTypeId → catalog_asset_types.id ────────────
-- Safe to run once. If FK already exists, this statement will fail — skip it.
ALTER TABLE fleet_units
  ADD CONSTRAINT fk_fleet_units_asset_type
    FOREIGN KEY (assetTypeId) REFERENCES catalog_asset_types(id);

-- ─── Verification ─────────────────────────────────────────────────────────────
-- SELECT asset_type_id, field_name FROM asset_type_fields ORDER BY asset_type_id, field_name;
-- Expected: 1 row MOTORCYCLE · 5 rows EQUIPMENT · 3 rows TRAILER = 9 total

-- SELECT COUNT(*) FROM fleet_units WHERE assetTypeId IS NULL OR assetTypeId = 0;
-- Expected: 0
