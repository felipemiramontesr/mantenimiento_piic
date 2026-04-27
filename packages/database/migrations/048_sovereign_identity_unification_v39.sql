-- 🔱 Archon Alpha v.39.4.4 - "Sovereign Structural Refactor"
-- Logic: Formal DB refactoring to unify identity under common_catalogs with full integrity.
-- Replaces previous attempt to ensure Foreign Key consistency.

-- 1. ELIMINAR RESTRICCIÓN ANTIGUA
-- Quitamos el candado que nos amarra a la tabla obsoleta.
ALTER TABLE users DROP FOREIGN KEY users_ibfk_1;

-- 2. LIMPIEZA & PREPARACIÓN DEL CATÁLOGO
DELETE FROM common_catalogs WHERE category = 'USER_ROLE' OR id = 989;

-- 3. INYECCIÓN DE ROLES SOBERANOS
INSERT INTO common_catalogs (category, code, label, numeric_value, is_active) VALUES 
('USER_ROLE', 'R_AUDIT', 'Auditor', 1.00, '1'),
('USER_ROLE', 'R_ARCHON', 'Archon', 10.00, '1'),
('USER_ROLE', 'R_ADMIN', 'Administrador', 20.00, '1'),
('USER_ROLE', 'R_OPER', 'Operador', 30.00, '1'),
('USER_ROLE', 'R_TECH', 'Técnico', 40.00, '1');

-- 4. MIGRACIÓN DE DATOS (IDs)
UPDATE users SET role_id = (SELECT id FROM common_catalogs WHERE category = 'USER_ROLE' AND code = 'R_ARCHON') WHERE role_id = 0;
UPDATE users SET role_id = (SELECT id FROM common_catalogs WHERE category = 'USER_ROLE' AND code = 'R_ADMIN') WHERE role_id = 1;
UPDATE users SET role_id = (SELECT id FROM common_catalogs WHERE category = 'USER_ROLE' AND code = 'R_OPER') WHERE role_id = 2;
UPDATE users SET role_id = (SELECT id FROM common_catalogs WHERE category = 'USER_ROLE' AND code = 'R_TECH') WHERE role_id = 3;

-- 5. ELIMINACIÓN DE TABLA OBSOLETA
DROP TABLE roles;

-- 6. ESTABLECER NUEVA INTEGRIDAD (Relación con el Catálogo)
-- Ahora users depende de common_catalogs, manteniendo la DB íntegra.
ALTER TABLE users 
ADD CONSTRAINT fk_users_common_catalogs 
FOREIGN KEY (role_id) REFERENCES common_catalogs(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;
