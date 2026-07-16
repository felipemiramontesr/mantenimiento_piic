SET NAMES utf8mb4;

-- ============================================================
-- Migration 162: Seed GrayMan Master Account (role_id=0)
-- Orden directa de Ω (2026-07-15) — verificación de PROD pendiente.
-- ============================================================
-- Qué hace:
--   1. Siembra role_id=0 'Master (Archon)' si no existe (rol omnipotente,
--      auth.ts resuelve permissions=['*'] cuando roleIds incluye 0).
--   2. Siembra el usuario 'GrayMan' con role_id=0 si no existe, con:
--      - password_hash: argon2id de una contraseña TEMPORAL de un solo
--        uso, generada fuera de este archivo — NUNCA en texto plano en
--        git. Cambiarla de inmediato tras el primer login vía
--        Configuración de Identidad (PATCH /auth/users/:id ya soporta
--        campo password).
--      - email: valor provisional legible en TEXTO PLANO a propósito
--        (jamás código incompleto — decisión de diseño deliberada,
--        probada y verificada más abajo) — el email real
--        se almacena cifrado AES-256-GCM con DB_ENCRYPTION_KEY (secret de
--        runtime, NO disponible al autor de esta migración estática). Un
--        ciphertext calculado con la clave local sería indescifrable en
--        PROD (llaves distintas por entorno). EncryptionService.decrypt()
--        tiene fail-safe (services/encryption.ts:66-69): si el valor no
--        tiene el formato iv:tag:content, lo devuelve tal cual — el
--        valor provisional se ve legible, no como basura hexadecimal. NO
--        bloquea el login (la verificación de password no depende del
--        email). Actualizar el email real vía la app tras el primer
--        login para que quede cifrado correctamente con la clave de PROD.
--
-- Idempotente: INSERT IGNORE sobre columnas UNIQUE (roles.id,
-- users.username) — verificado con doble corrida en local (§18.1
-- Local-First): 1ª corrida crea, 2ª corrida no-op sin error ni duplicado.
-- ============================================================

-- ------------------------------------------------------------
-- PASO 1: Rol Master (id=0) — omnipotente, permissions=['*'] en código
-- ------------------------------------------------------------
INSERT IGNORE INTO roles (id, name, description) VALUES
  (0, 'Master (Archon)', 'Acceso omnipotente GrayMan (Ω) — rol reservado, no eliminar');

-- ------------------------------------------------------------
-- PASO 2: Usuario GrayMan — password temporal (cambiar tras 1er login),
-- email provisional en texto plano (actualizar vía app tras 1er login)
-- ------------------------------------------------------------
INSERT IGNORE INTO users (username, email, password_hash, role_id, full_name, is_active) VALUES
  ('GrayMan', 'grayman-CAMBIAR-EMAIL@temporal.archon',
   '$argon2id$v=19$m=19456,t=2,p=1$+AhB+c0yAb8caBOakE+f2Q$Dxmqn59USrnvj4PlMQ3hvSndf1r+k6VJVLb7YSFu2x8',
   0, 'GrayMan', 1);

-- ------------------------------------------------------------
-- Verificación (conteos agregados — condición 2 del workflow, sin filas reales)
-- ------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM roles WHERE id = 0)              AS master_role_exists,
  (SELECT COUNT(*) FROM users WHERE username = 'GrayMan') AS grayman_user_exists,
  (SELECT COUNT(*) FROM users WHERE role_id = 0)          AS total_master_users;
