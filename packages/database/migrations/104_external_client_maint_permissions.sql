SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 104 — External Client Maintenance + Alerts Access
-- Context : GrayMan requested 2026-06-14: rol 9 (Cliente Externo) must have
--           CRUD access to Maintenance panel and visibility into Alerts panel.
--           Both panels are gated by maint:view in the Sidebar. maint:write
--           enables creating and completing maintenance records.
--           Note: maintenance routes currently have no owner-scope guard —
--           this grants cross-fleet visibility; scoped enforcement is deferred.
-- Idempotent: safe to run multiple times (INSERT IGNORE).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1 — Ensure permissions exist (idempotent seeds)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO permissions (slug, description) VALUES
  ('maint:view',  'Ver registros de mantenimiento'),
  ('maint:write', 'Registrar y completar órdenes de mantenimiento');

-- -----------------------------------------------------------------------------
-- STEP 2 — Grant maint:view and maint:write to role 9 (Cliente Externo)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 9, id FROM permissions WHERE slug IN ('maint:view', 'maint:write');
