-- ============================================================
-- Migration 112: Archon Master — Role Restructure
-- Context: FC Archon_Master_Role_Restructure
--          Renumbers roles to reflect the dual-suite hierarchy:
--          ERP band (1=Flotilla, 2=Area) · VIM band (3=Centro, 4=Privado, 5=Familiar)
--          Plan AG §7.1: INSERT new IDs first → UPDATE users/perms → UPDATE role names.
--          No DELETE on existing IDs — avoids FK violation windows.
-- Idempotent: INSERT IGNORE + UPDATE idempotent on repeated runs.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── Paso 1: Insertar nuevos destinos (id=4 Privado, id=5 Familiar) ──────────
-- Los IDs 4 y 5 deben existir ANTES de mover usuarios para no violar FK.
INSERT IGNORE INTO roles (id, name, description, created_at) VALUES
  (4, 'Propietario Privado', 'Usuario individual (VIM). Gestión de vehículos personales. Scope restringido.', NOW()),
  (5, 'Familiar', 'Sub-usuario de Propietario Privado (VIM). Acceso de solo lectura al historial del vehículo.', NOW());

-- ─── Paso 2: Mover usuarios y permisos de IDs viejos a nuevos ────────────────
UPDATE users          SET role_id = 4 WHERE role_id = 2;
UPDATE users          SET role_id = 5 WHERE role_id = 3;
UPDATE role_permissions SET role_id = 4 WHERE role_id = 2;
UPDATE role_permissions SET role_id = 5 WHERE role_id = 3;
UPDATE user_roles     SET role_id = 4 WHERE role_id = 2;
UPDATE user_roles     SET role_id = 5 WHERE role_id = 3;

-- ─── Paso 3: Reutilizar IDs 2 y 3 con los nuevos roles ───────────────────────
-- UPDATE en lugar de DELETE+INSERT para preservar integridad referencial.
UPDATE roles SET
  name        = 'Área',
  description = 'Sub-usuario de Propietario de Flotilla (ERP). Acceso funcional acotado al área asignada.'
WHERE id = 2;

UPDATE roles SET
  name        = 'Centro Especializado',
  description = 'Administrador VIM de Propietarios Privados y sus Familiares. Suite VIM con capacidades de alta.'
WHERE id = 3;

-- ─── Paso 4: ALTER owners — agregar parent_owner_id (FK auto-referencial) ────
ALTER TABLE owners
  ADD COLUMN IF NOT EXISTS parent_owner_id INT NULL DEFAULT NULL AFTER owner_type,
  ADD CONSTRAINT fk_owners_parent
    FOREIGN KEY (parent_owner_id) REFERENCES owners(id) ON DELETE SET NULL;

-- ─── Paso 5: Expandir ENUM owner_type para incluir CENTER ────────────────────
ALTER TABLE owners
  MODIFY owner_type ENUM('FLOTILLA', 'PRIVATE', 'CENTER') NOT NULL DEFAULT 'FLOTILLA';

SET FOREIGN_KEY_CHECKS = 1;

-- ─── Verificación post-migración ─────────────────────────────────────────────
-- SELECT id, name FROM roles ORDER BY id;
-- DESCRIBE owners;
