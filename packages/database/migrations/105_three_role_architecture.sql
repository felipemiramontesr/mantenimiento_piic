-- ============================================================
-- Migration 105: Three-Role Architecture Refactor
-- Roles: 0 Archon (unchanged) · 1 Prop. Flotilla · 2 Prop. Privado
-- Eliminates: roles 1–9 (old) and seed users 11–18
-- Idempotent: safe to run multiple times
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Remove old seed test users (roles 1–8, seed data only)
DELETE FROM users WHERE role_id BETWEEN 1 AND 8;

-- 2. Remove user_roles entries for old roles 1–9
DELETE FROM user_roles WHERE role_id BETWEEN 1 AND 9;

-- 3. Remove user_fleet_owners orphans (no cascade defined)
DELETE FROM user_fleet_owners WHERE user_id NOT IN (SELECT id FROM users);

-- 4. Remove role_permissions for old roles 1–9
DELETE FROM role_permissions WHERE role_id BETWEEN 1 AND 9;

-- 5. Remove old roles 1–9
DELETE FROM roles WHERE id BETWEEN 1 AND 9;

-- 6. Create new roles
INSERT IGNORE INTO roles (id, name, description, created_at) VALUES
  (1, 'Propietario de Flotilla', 'Empresa con acceso ERP completo. Scope restringido a unidades asignadas.', NOW()),
  (2, 'Propietario Privado',     'Usuario individual (VIM). Gestión de vehículos personales. Scope restringido.', NOW());

-- 7. Assign permissions to Rol 1 (Flotilla) — same base as old Rol 9
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
WHERE slug IN ('fleet:view', 'fleet:scoped', 'fleet:write:scoped', 'maint:view', 'maint:write');

-- 8. Assign permissions to Rol 2 (Privado) — same base as old Rol 9
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions
WHERE slug IN ('fleet:view', 'fleet:scoped', 'fleet:write:scoped', 'maint:view', 'maint:write');

-- 9. Reassign test user (id=19) from old Rol 9 → new Rol 1 (Flotilla)
UPDATE users SET role_id = 1 WHERE id = 19 AND role_id = 9;

-- 10. Fix user_roles for test user
DELETE FROM user_roles WHERE user_id = 19;
INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (19, 1);

SET FOREIGN_KEY_CHECKS = 1;
