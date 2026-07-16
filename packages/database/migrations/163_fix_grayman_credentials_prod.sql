SET NAMES utf8mb4;

-- ============================================================
-- Migration 163: Fix GrayMan Credentials in PROD (remediation)
-- Orden directa de Omega (2026-07-16) -- login post-migracion 162 con
-- L4 (password no coincide) pese a hash/password verificados como
-- correctos en local (bun -e verify() -> true). L4 solo se dispara si
-- el usuario SI fue encontrado (si no, seria L3) -- evidencia de que ya
-- existia una fila 'GrayMan' en PROD ANTES de la migracion 162 con un
-- password_hash y/o role_id distinto, que el INSERT IGNORE dejo intacta
-- (INSERT IGNORE nunca sobreescribe una fila existente).
-- ============================================================
-- Que hace:
--   UPDATE incondicional (no INSERT) sobre la fila EXISTENTE de
--   'GrayMan' -- fuerza password_hash al mismo hash temporal ya
--   comunicado a Omega EXCLUSIVAMENTE por chat -- el valor en texto
--   plano NUNCA se referencia en este archivo ni en el mensaje de
--   commit -- y role_id=0 (Master, omnipotente), sin
--   importar que valores tenia antes. Idempotente por construccion:
--   asignar el mismo valor N veces produce el mismo estado final, sin
--   error ni efecto secundario -- verificado con doble corrida en local
--   (Libro VIII 18.1).
-- ============================================================

UPDATE users
SET password_hash = '$argon2id$v=19$m=19456,t=2,p=1$+AhB+c0yAb8caBOakE+f2Q$Dxmqn59USrnvj4PlMQ3hvSndf1r+k6VJVLb7YSFu2x8',
    role_id = 0
WHERE username = 'GrayMan';

-- ------------------------------------------------------------
-- Verificacion (conteos agregados -- condicion 2 del workflow, sin filas reales)
-- ------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM users WHERE username = 'GrayMan')                 AS grayman_rows,
  (SELECT COUNT(*) FROM users WHERE username = 'GrayMan' AND role_id = 0) AS grayman_role0,
  ROW_COUNT()                                                             AS last_update_rows_changed;
