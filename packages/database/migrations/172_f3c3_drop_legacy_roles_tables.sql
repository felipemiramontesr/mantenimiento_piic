-- Migration 172: FC082 F3c3 — DROP físico de las tablas legacy de roles
-- (roles, user_roles, role_permissions), cierre de la última sub-fase de
-- FC082 F3c. Dictaminada O✓Alfa/R✓Bravo CONDICIONADO 10/10 sobre 093_AN,
-- Cond.3/5 específicas de esta sub-fase.
--
-- Contexto: F3a sembró el chasis cosmonauta (cosmonaut_roles/
-- cosmonaut_role_assignments/cosmonaut_role_permissions), F3b cortó
-- login/refresh/me/switch-tenant a ese chasis, F3c1 re-ancló los 2
-- residuales (R3 /node, R4 PATCH /users/:id) + notification.service.ts +
-- social.ts + recallsVim.ts, F3c2 retiró el panel CRUD legacy completo
-- (admin.ts + frontend). Con eso, roles/user_roles/role_permissions ya no
-- tienen ningún consumidor productivo — confirmado por grep CI exhaustivo
-- (Cond.5) antes de escribir esta migración: 0 referencias vivas fuera de
-- comentarios y el snapshot histórico packages/database/recent/.
--
-- Hallazgo adicional de ese grep CI (fuera del scope original de F3c1/c2,
-- corregido en el mismo commit que esta migración, no aquí): 6 JOINs
-- cosméticos a `roles` en auth.ts (/login, /refresh, /me, /switch-tenant,
-- GET /users) y fleetRoutes.ts (/routes/:uuid/node) para un campo
-- role_name/driver_role de solo-display. Reemplazados por
-- `CASE WHEN u.role_id = 0 THEN 'GrayMan' ELSE NULL END` — equivalente
-- exacto al LEFT JOIN previo (roles solo tiene la fila 0 desde mig.164,
-- cualquier otro role_id ya resolvía NULL). GET /users tenía además un
-- INNER JOIN roles real — un bug preexistente que ocultaba en silencio a
-- cualquier usuario con role_id != 0 del Directorio; corregido de paso.
--
-- Cond.3 (Bravo, plan explícito users.role_id/FK pre-DROP): la COLUMNA
-- users.role_id se CONSERVA sin cambios — sigue siendo el marcador activo
-- de Ω (role_id=0), leído por cosmonautMiddleware.antiEscalationGuard,
-- auth.ts PATCH /users/:id (validateRoleIdUpdate/syncGrayManCosmonautAssignment)
-- y notification.service.ts. Solo se elimina la FK que la ataba a `roles`
-- (roles desaparece). El nombre de esa FK es autogenerado por MySQL
-- (`users_ibfk_1` en local, verificado vía information_schema) — la
-- migración lo resuelve dinámicamente en vez de asumir el mismo nombre en
-- PROD, mismo patrón PREPARE/EXECUTE ya usado en mig.169 para DDL condicional.
--
-- Cond.4: onboarding.ts (los 4 endpoints que insertaban en user_roles)
-- fue retirado a guard 501 puro en el mismo commit que esta migración —
-- precondición para que este DROP sea seguro.
--
-- Idempotente: DROP TABLE IF EXISTS no falla si la tabla ya no existe;
-- el DROP de la FK usa el patrón condicional (no-op si ya fue eliminada).
-- Verificado en terreno: correr esta migración 2 veces seguidas produce el
-- mismo resultado (0 tablas, 0 FK, columna users.role_id intacta).

SET NAMES utf8mb4;

-- ─── (0) Evidencia pre-DROP — conteo de filas antes de perderlas ─────────
-- Condicional por tabla (dinámico): en la 2da corrida (idempotencia) las
-- 3 tablas ya no existen — un SELECT directo fallaría con ERROR 1146.
SET @roles_exists = (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles'
);
SET @sql = IF(@roles_exists > 0,
  'SELECT ''pre_drop_roles'' AS k, COUNT(*) AS v FROM roles',
  'SELECT ''pre_drop_roles'' AS k, 0 AS v');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @user_roles_exists = (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_roles'
);
SET @sql = IF(@user_roles_exists > 0,
  'SELECT ''pre_drop_user_roles'' AS k, COUNT(*) AS v FROM user_roles',
  'SELECT ''pre_drop_user_roles'' AS k, 0 AS v');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @role_permissions_exists = (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permissions'
);
SET @sql = IF(@role_permissions_exists > 0,
  'SELECT ''pre_drop_role_permissions'' AS k, COUNT(*) AS v FROM role_permissions',
  'SELECT ''pre_drop_role_permissions'' AS k, 0 AS v');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── (1) DROP dinámico de la FK users.role_id → roles(id) ────────────────
-- No asume el nombre (users_ibfk_1 en local; PROD pudo auto-generar otro
-- tras su propio historial de ALTERs) — lo resuelve vía information_schema.
SET @fk_name = (
  SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role_id'
    AND REFERENCED_TABLE_NAME = 'roles'
  LIMIT 1
);
SET @drop_fk_sql = IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE users DROP FOREIGN KEY ', @fk_name),
  'SELECT 1'
);
PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ─── (2) DROP de las 3 tablas — dependientes primero (role_permissions y
-- user_roles referencian roles), luego roles ────────────────────────────
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;

-- ─── Verificación post-DROP (Cond.5) ──────────────────────────────────────
-- Esperado: 0 filas — las 3 tablas ya no existen.
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('roles', 'user_roles', 'role_permissions');

-- Esperado: 0 filas — la FK ya no existe (sin importar su nombre original).
SELECT CONSTRAINT_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Esperado: 1 fila — users.role_id sigue existiendo (Cond.3: columna
-- conservada, marcador Ω vivo). SHOW COLUMNS, no information_schema.COLUMNS
-- (hallazgo de terreno mig.168: information_schema.COLUMNS no es confiable
-- en este hosting).
SHOW COLUMNS FROM users WHERE Field = 'role_id';

-- Smoke test — users sigue consultable con normalidad tras el DROP+ALTER.
SELECT COUNT(*) AS smoke_users_count FROM users;
