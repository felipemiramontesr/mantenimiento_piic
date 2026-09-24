-- ============================================================
-- Migration 178: Email MFA Schema & Email Verification — FC195 F1
--   (Email_Second_Factor_And_Universal_2FA_Rollout)
-- Context: debate 383_AN + dictámenes 384–389_AN. Segundo factor por correo SOLO para Arc
--          (Ω y MU siguen con TOTP, Invariante 9), código de 8 caracteres guardado con
--          Argon2id (D-Ω4/D-Ω5), TTL 10 min por reloj de la DB (NOW()), 5 intentos, 3 envíos.
--
-- users.email_verified_at — absorbe FC187 F2/F5 (D-Ω8). NULL = correo sin verificar; el
--   enrolamiento del 2FA por correo lo sella al validar el primer código (F2).
-- user_mfa_credentials.type — se agrega 'email' al ENUM (los valores existentes no cambian).
--   secret_encrypted pasa a NULL-able: una credencial 'email' no tiene secreto que guardar
--   (el código viaja por reto, en mfa_challenges). Las filas 'totp' existentes siguen con su
--   secreto; F2 valida que 'totp' nunca se persista sin él.
-- mfa_challenges — canal del reto y estado del código por correo:
--   channel       'totp' por defecto: los retos existentes y los nuevos de TOTP no cambian.
--   code_hash     Argon2id del código de 8 caracteres; NULL en retos TOTP. Nunca texto plano.
--   expires_at    NOW() + INTERVAL 10 MINUTE al emitir/reenviar; NULL en retos TOTP.
--   resend_count  envíos adicionales ya hechos (máx. 2 → 3 envíos en total).
--   last_sent_at  base del cooldown de 60 s entre envíos.
--
-- Solo aditiva: 0 DROP, 0 recreación de 176/177, 0 filas tocadas.
-- Idempotente: ADD COLUMN IF NOT EXISTS; los MODIFY re-aplicados dejan la misma definición.
-- Orden obligatorio (directiva Ω 2026-09-24): PRIMERO local, verificar, y DESPUÉS prod vía
-- db-migrations.yml — y el código de F2 que usa estas columnas no se publica antes.
-- ============================================================

SET NAMES utf8mb4;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL DEFAULT NULL AFTER email;

ALTER TABLE user_mfa_credentials
  MODIFY COLUMN type ENUM('totp', 'webauthn', 'email') NOT NULL DEFAULT 'totp',
  MODIFY COLUMN secret_encrypted VARCHAR(255) NULL DEFAULT NULL;

ALTER TABLE mfa_challenges
  ADD COLUMN IF NOT EXISTS channel ENUM('totp', 'email') NOT NULL DEFAULT 'totp' AFTER user_id,
  ADD COLUMN IF NOT EXISTS code_hash VARCHAR(255) NULL DEFAULT NULL AFTER channel,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL DEFAULT NULL AFTER code_hash,
  ADD COLUMN IF NOT EXISTS resend_count INT NOT NULL DEFAULT 0 AFTER expires_at,
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP NULL DEFAULT NULL AFTER resend_count;

-- ─── Verification (ejecutar manualmente post-apply) ──────────────────────────
-- SELECT COUNT(*) FROM information_schema.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE() AND (
--   (TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified_at') OR
--   (TABLE_NAME = 'mfa_challenges' AND COLUMN_NAME IN
--     ('channel', 'code_hash', 'expires_at', 'resend_count', 'last_sent_at')) OR
--   (TABLE_NAME = 'user_mfa_credentials' AND COLUMN_NAME = 'type'
--     AND COLUMN_TYPE = "enum('totp','webauthn','email')"));
-- Esperado: 7
