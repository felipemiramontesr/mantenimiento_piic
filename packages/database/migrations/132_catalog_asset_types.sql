SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 132 — catalog_asset_types
-- FC-AssetType_ConditionalFields · FaseA
-- Creates the asset type catalog with 4 initial types.
-- Idempotent: CREATE TABLE IF NOT EXISTS + INSERT IGNORE
-- =============================================================================

CREATE TABLE IF NOT EXISTS catalog_asset_types (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code      VARCHAR(32)  NOT NULL,
  label     VARCHAR(64)  NOT NULL,
  icon_name VARCHAR(64)  NOT NULL DEFAULT 'truck',
  PRIMARY KEY (id),
  UNIQUE KEY uq_cat_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO catalog_asset_types (id, code, label, icon_name) VALUES
(1, 'VEHICLE',    'Vehículo',    'truck'),
(2, 'MOTORCYCLE', 'Motocicleta', 'motorcycle'),
(3, 'EQUIPMENT',  'Equipo',      'cog'),
(4, 'TRAILER',    'Remolque',    'trailer');

-- ─── Verification ─────────────────────────────────────────────────────────────
-- SELECT id, code, label FROM catalog_asset_types ORDER BY id;
-- Expected: 4 rows (VEHICLE, MOTORCYCLE, EQUIPMENT, TRAILER)
