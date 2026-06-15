-- ============================================================
-- Migration 111: Archon Master — role 3 (Familiar)
-- Context: FC Archon_Master_Fase1_Identity_Foundation
--          Sub-user role for P. Privado owners (VIM).
--          Familiar types: PAREJA, HIJO_A (fixed in code, not dynamic).
--          Permissions: fleet:view + fleet:scoped (read-only, owner-scoped).
-- Idempotent: safe to run multiple times (INSERT IGNORE)
-- ============================================================

SET NAMES utf8mb4;

-- Step 1: Create Familiar role
INSERT IGNORE INTO roles (id, name, description, created_at) VALUES
  (3, 'Familiar', 'Sub-usuario de Propietario Privado (VIM). Acceso de solo lectura al historial del vehículo.', NOW());

-- Step 2: Assign base permissions to Familiar role
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE slug IN ('fleet:view', 'fleet:scoped');
