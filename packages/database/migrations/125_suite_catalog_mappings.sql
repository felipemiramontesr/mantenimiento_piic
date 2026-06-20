-- Migration 125: Suite Catalog Mappings — tabla de categorías válidas por suite
-- FC-2: UniverseDataSchema_SuiteCatalogs · Subfase 2B · Firmado: 2026-06-20 (SC)
-- EAL6+ multi-tenant isolation: SPECIALTY exclusivo VIM · FLEET_AREA exclusivo ERP
-- Alineado con dictamen AG: Opción C Híbrida · 3NF preservada
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS suite_catalog_mappings (
  suite     ENUM('VIM', 'ERP') NOT NULL,
  category  VARCHAR(50)        NOT NULL,
  PRIMARY KEY (suite, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Governs which common_catalog categories are valid per owner suite (EAL6+ multi-tenant isolation)';

-- ── VIM: Universo de talleres (CENTER) y propietarios privados (PRIVATE) ──────
-- SPECIALTY es exclusivo de VIM — talleres definen sus especialidades mecánicas
INSERT INTO suite_catalog_mappings (suite, category) VALUES
  ('VIM', 'SPECIALTY'),
  ('VIM', 'ASSET_TYPE'),
  ('VIM', 'BRAND'),
  ('VIM', 'COMPLIANCE_STATUS'),
  ('VIM', 'DEPARTMENT'),
  ('VIM', 'DRIVE_TYPE'),
  ('VIM', 'ENGINE_TYPE'),
  ('VIM', 'FILTER_BRAND'),
  ('VIM', 'FLEET_OWNER'),
  ('VIM', 'FREQ_TIME'),
  ('VIM', 'FREQ_USAGE'),
  ('VIM', 'FUEL'),
  ('VIM', 'FUEL_TYPE'),
  ('VIM', 'INSURANCE_COMPANY'),
  ('VIM', 'LOCATION'),
  ('VIM', 'LUBE_BRAND'),
  ('VIM', 'MAINTENANCE_CENTER'),
  ('VIM', 'MAINT_FREQ_TIME'),
  ('VIM', 'MAINT_FREQ_USAGE'),
  ('VIM', 'MAINTENANCE_TIME_FREQ'),
  ('VIM', 'MAINTENANCE_USAGE_FREQ'),
  ('VIM', 'MODEL'),
  ('VIM', 'OPERATIONAL_USE'),
  ('VIM', 'ROUTE_ORIGIN'),
  ('VIM', 'TERRAIN_TYPE'),
  ('VIM', 'TIRE_BRAND'),
  ('VIM', 'TRANSMISSION'),
  ('VIM', 'VEHICLE_COLOR');

-- ── ERP: Universo de flotillas corporativas (FLOTILLA) ────────────────────────
-- FLEET_AREA es exclusivo de ERP — empresas organizan sus unidades por área/depto
INSERT INTO suite_catalog_mappings (suite, category) VALUES
  ('ERP', 'FLEET_AREA'),
  ('ERP', 'ASSET_TYPE'),
  ('ERP', 'BRAND'),
  ('ERP', 'COMPLIANCE_STATUS'),
  ('ERP', 'DEPARTMENT'),
  ('ERP', 'DRIVE_TYPE'),
  ('ERP', 'ENGINE_TYPE'),
  ('ERP', 'FILTER_BRAND'),
  ('ERP', 'FLEET_OWNER'),
  ('ERP', 'FREQ_TIME'),
  ('ERP', 'FREQ_USAGE'),
  ('ERP', 'FUEL'),
  ('ERP', 'FUEL_TYPE'),
  ('ERP', 'INSURANCE_COMPANY'),
  ('ERP', 'LOCATION'),
  ('ERP', 'LUBE_BRAND'),
  ('ERP', 'MAINTENANCE_CENTER'),
  ('ERP', 'MAINT_FREQ_TIME'),
  ('ERP', 'MAINT_FREQ_USAGE'),
  ('ERP', 'MAINTENANCE_TIME_FREQ'),
  ('ERP', 'MAINTENANCE_USAGE_FREQ'),
  ('ERP', 'MODEL'),
  ('ERP', 'OPERATIONAL_USE'),
  ('ERP', 'ROUTE_ORIGIN'),
  ('ERP', 'TERRAIN_TYPE'),
  ('ERP', 'TIRE_BRAND'),
  ('ERP', 'TRANSMISSION'),
  ('ERP', 'VEHICLE_COLOR');
