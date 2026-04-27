-- 🔱 Archon Alpha v.39.4.3 - "Sovereign Identity Unification"
-- Logic: Migrating roles to common_catalogs and deconstructing the legacy roles table.
-- Purpose: Architectural consistency and total scalability.

-- 1. LIMPIEZA: Borramos el registro "Auditor" previo (ID 989) para reiniciar desde cero.
DELETE FROM common_catalogs WHERE category = 'USER_ROLE' OR id = 989;

-- 2. INYECCIÓN: Insertamos los roles oficiales en el catálogo con pesos de ordenamiento.
INSERT INTO common_catalogs (category, code, label, numeric_value, is_active) VALUES 
('USER_ROLE', 'R_AUDIT', 'Auditor', 1.00, '1'),       -- Prioridad 1: Auditor
('USER_ROLE', 'R_ARCHON', 'Archon', 10.00, '1'),      -- Prioridad 10: Master
('USER_ROLE', 'R_ADMIN', 'Administrador', 20.00, '1'), -- Prioridad 20: Admin
('USER_ROLE', 'R_OPER', 'Operador', 30.00, '1'),      -- Prioridad 30: Campo
('USER_ROLE', 'R_TECH', 'Técnico', 40.00, '1');       -- Prioridad 40: Mantenimiento

-- 3. MIGRACIÓN DE USUARIOS: Actualizamos la tabla users para que apunte a los nuevos IDs.
-- Mapeo seguro basado en los códigos insertados arriba.
UPDATE users SET role_id = (SELECT id FROM common_catalogs WHERE category = 'USER_ROLE' AND code = 'R_ARCHON') WHERE role_id = 0;
UPDATE users SET role_id = (SELECT id FROM common_catalogs WHERE category = 'USER_ROLE' AND code = 'R_ADMIN') WHERE role_id = 1;
UPDATE users SET role_id = (SELECT id FROM common_catalogs WHERE category = 'USER_ROLE' AND code = 'R_OPER') WHERE role_id = 2;
UPDATE users SET role_id = (SELECT id FROM common_catalogs WHERE category = 'USER_ROLE' AND code = 'R_TECH') WHERE role_id = 3;

-- 4. DECONSTRUCCIÓN: Eliminamos la tabla roles ahora que su información vive en el catálogo.
DROP TABLE roles;
