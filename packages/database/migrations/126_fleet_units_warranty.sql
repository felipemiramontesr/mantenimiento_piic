SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 126 — VIM Perfect Universe: Warranty columns for fleet_units
-- Adds warranty_expiration_date and warranty_expiration_km to fleet_units.
-- Both nullable — not all vehicles have active warranty data.
-- Idempotent: ALTER ignores existing columns via procedure check.
-- =============================================================================

ALTER TABLE fleet_units
  ADD COLUMN IF NOT EXISTS warranty_expiration_date DATE         NULL COMMENT 'Garantía de fábrica — fecha de vencimiento (NULL = sin datos)',
  ADD COLUMN IF NOT EXISTS warranty_expiration_km   INT UNSIGNED NULL COMMENT 'Garantía de fábrica — km de vencimiento (NULL = sin datos)';
