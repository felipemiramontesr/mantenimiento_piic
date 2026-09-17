-- ============================================================
-- Migration 176: User MFA Schema — FC185 F1 (Sovereign_MFA_TOTP_Two_Step_Authentication)
-- Context: 337_AN (Charlie) confirmó 0 infraestructura de MFA existente; 338/339/340_AN
--          (Alfa/Bravo) cerraron el contrato — TOTP nativo RFC 6238, cero dependencias npm.
--
-- user_mfa_credentials: 1 fila por (user_id, type) -- hoy solo 'totp' se usa, 'webauthn' queda
--   en el ENUM desde ahora para no tener que ALTER el tipo en FC186+ (339_AN). `secret_encrypted`
--   es reversible (AES-256-GCM vía EncryptionService, NO argon2 -- el servidor necesita poder
--   recalcular el código esperado en cada verificación, a diferencia de `password_hash`).
--   `is_confirmed = 0` mientras el usuario no demuestre poder generar un código válido con su app
--   autenticadora (invariante: nunca queda "enrolado" un secreto no confirmado). `last_used_step`
--   persiste el último contador TOTP consumido -- R6 (340_AN, Bravo): anti-replay, rechaza reusar
--   el mismo código dentro de la ventana de deriva de 90s. UNIQUE(user_id, type) permite upsert
--   limpio si el usuario reinicia el enrolamiento antes de confirmar (sin filas huérfanas).
--
-- user_mfa_backup_codes: 8 códigos de un solo uso por usuario (invariante 3 del FC), hash
--   Argon2id (R7, 340_AN -- SÍ es correcto hashear estos de forma irreversible, a diferencia del
--   secreto TOTP: un código de respaldo se valida por igualdad de hash una sola vez y se quema,
--   nunca se recalcula). `used_at IS NULL` = disponible; se marca atómicamente al consumirse.
--
-- Ambas con ON DELETE CASCADE -- si el usuario se elimina (Ω, FC159 R3b), su estado MFA se
-- elimina con él, mismo criterio que `user_billing_profiles` (migración 174).
-- Idempotente: CREATE TABLE IF NOT EXISTS.
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS user_mfa_credentials (
  id                INT           NOT NULL AUTO_INCREMENT,
  user_id           INT           NOT NULL,
  type              ENUM('totp', 'webauthn') NOT NULL DEFAULT 'totp',
  secret_encrypted  VARCHAR(255)  NOT NULL,
  is_confirmed      TINYINT(1)    NOT NULL DEFAULT 0,
  last_used_step    BIGINT        NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at      TIMESTAMP     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_umc_user_type (user_id, type),
  CONSTRAINT fk_umc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_mfa_backup_codes (
  id          INT           NOT NULL AUTO_INCREMENT,
  user_id     INT           NOT NULL,
  code_hash   VARCHAR(255)  NOT NULL,
  used_at     TIMESTAMP     NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_umbc_user (user_id),
  CONSTRAINT fk_umbc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Verification (ejecutar manualmente post-apply) ──────────────────────────
-- SELECT COUNT(*) FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('user_mfa_credentials', 'user_mfa_backup_codes');
-- Esperado: 2
