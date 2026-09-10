SET NAMES utf8mb4;

-- ============================================================
-- Migration 173: Reset GrayMan Password in PROD (recurrencia de 163)
-- Orden directa de Omega (2026-09-10). Mismo sintoma que motivo la
-- migracion 163: el login de PROD con usuario 'GrayMan' devuelve 401
-- L4 (password no coincide con el hash guardado) -- L4 solo se dispara
-- si la fila 'GrayMan' SI existe (si no, seria L3), asi que no es un
-- bug de ruta (login tiene 105/105 tests API). En LOCAL ya se reseteo
-- con la utilidad FC169 (apps/api/src/scripts/resetUserPassword.ts) y
-- se verifico end-to-end (POST /v1/auth/login -> HTTP 200). Esta
-- migracion aplica el MISMO reset en PROD por el pipeline gobernado
-- FC064 (db-migrations.yml: workflow_dispatch, environment
-- production-db con required reviewer = Omega, backup cifrado previo).
-- ============================================================
-- Que hace:
--   UPDATE incondicional (no INSERT) sobre la fila EXISTENTE de
--   'GrayMan' -- fuerza password_hash al hash temporal ya comunicado a
--   Omega EXCLUSIVAMENTE por chat (el valor en texto plano NUNCA se
--   referencia en este archivo ni en el mensaje de commit; el hash de
--   abajo es argon2id irreversible), y role_id=0 (Master) de forma
--   defensiva -- mismo criterio que la migracion 163. El hash se
--   genero con `@node-rs/argon2` (`hash(password)` sin objeto de
--   opciones -> params por defecto $argon2id$v=19$m=19456,t=2,p=1$,
--   identicos a los del alta de usuario del sistema y a la migracion
--   163). Idempotente por construccion: asignar el mismo valor N veces
--   produce el mismo estado final, sin error ni efecto secundario.
--   Omega cambiara esta contrasena temporal directamente en la app
--   despues de confirmar el login de PROD.
-- ============================================================

UPDATE users
SET password_hash = '$argon2id$v=19$m=19456,t=2,p=1$j7Rnk5yq1SKepeZpaS+7ew$VqFwrUJHb5wtK5CdoykgTjA5yl3ra40bCNWCNX/8m/Q',
    role_id = 0
WHERE username = 'GrayMan';

-- ------------------------------------------------------------
-- Verificacion (conteos agregados -- condicion 2 del workflow, sin filas reales)
-- ------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM users WHERE username = 'GrayMan')                 AS grayman_rows,
  (SELECT COUNT(*) FROM users WHERE username = 'GrayMan' AND role_id = 0) AS grayman_role0,
  ROW_COUNT()                                                             AS last_update_rows_changed;
