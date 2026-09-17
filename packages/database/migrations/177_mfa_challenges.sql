-- ============================================================
-- Migration 177: MFA Login Challenges — FC185 F2 (Backend_Two_Step_Auth_Pipeline_And_Recovery)
-- Context: 340_AN (Bravo) exige que el `mfaToken` de login (JWT efímero, TTL 5m) se revoque tras
--          5 intentos fallidos de código. Un JWT es inmutable una vez firmado -- no puede
--          "recordar" cuántas veces falló -- así que el contador vive aquí, indexado por
--          `challenge_id` (un UUID embebido en el propio JWT, NUNCA el JWT completo). El login
--          firma el JWT + crea esta fila en la misma operación; /mfa/verify busca por
--          `challenge_id`, incrementa `attempts_used` en cada fallo, y marca `revoked = 1` al
--          5to fallo O al primer éxito (un challenge es de un solo uso en ambos casos).
--
-- `expires_at` NO se agrega: el JWT ya lleva su propio `exp` (5m) via @fastify/jwt, que
-- `request.server.jwt.verify()` ya rechaza automáticamente -- una segunda fecha de expiración
-- redundante aquí solo podría desincronizarse de la real. `created_at` alcanza para auditoría.
-- Idempotente: CREATE TABLE IF NOT EXISTS.
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS mfa_challenges (
  id             INT           NOT NULL AUTO_INCREMENT,
  challenge_id   CHAR(36)      NOT NULL,
  user_id        INT           NOT NULL,
  attempts_used  TINYINT       NOT NULL DEFAULT 0,
  revoked        TINYINT(1)    NOT NULL DEFAULT 0,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mfac_challenge_id (challenge_id),
  CONSTRAINT fk_mfac_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Verification (ejecutar manualmente post-apply) ──────────────────────────
-- SELECT COUNT(*) FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mfa_challenges';
-- Esperado: 1
