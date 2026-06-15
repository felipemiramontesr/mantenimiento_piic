-- ============================================================
-- Migration 108: Archon Master — areas + area_permissions tables
-- Context: FC Archon_Master_Fase1_Identity_Foundation
--          Dynamic organizational units for P. Flotilla owners.
--          P. Privado owners do NOT use areas.
-- Idempotent: safe to run multiple times (CREATE TABLE IF NOT EXISTS)
-- Run AFTER migration 107 (requires owners table).
-- ============================================================

SET NAMES utf8mb4;

-- Step 1: Areas — organizational units created by FLOTILLA owners
CREATE TABLE IF NOT EXISTS areas (
  id         INT NOT NULL AUTO_INCREMENT,
  owner_id   INT NOT NULL,
  name       VARCHAR(255) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_areas_owner FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
  INDEX idx_areas_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Area permissions — configurable permission slugs per area
CREATE TABLE IF NOT EXISTS area_permissions (
  area_id         INT NOT NULL,
  permission_slug VARCHAR(100) NOT NULL,
  PRIMARY KEY (area_id, permission_slug),
  CONSTRAINT fk_ap_area FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE,
  INDEX idx_ap_slug (permission_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
