-- =============================================================================
-- Migration: 084 — Extend service_mode ENUM
-- Adds IN_SITU and WORKSHOP values required by resolveServiceMode() logic.
-- =============================================================================

ALTER TABLE fleet_maintenance_extensions
  MODIFY COLUMN service_mode
    ENUM('FULL_COMPLIANCE','PARTIAL_EXECUTION','IN_SITU','WORKSHOP')
    NOT NULL DEFAULT 'FULL_COMPLIANCE';
