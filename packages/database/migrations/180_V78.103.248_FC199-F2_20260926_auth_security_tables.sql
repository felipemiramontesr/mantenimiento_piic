-- ============================================================
-- Migration 180: tablas de seguridad de autenticación — FC199 F2 · 2026-09-26
--   (Anti_Bot_Defense_In_Depth_And_Rate_Limiting_Hardening)
-- Context: defensa anti-bots de Archon (416_AN Charlie · 417/421_AN Alfa · 418/419/422_AN Bravo).
--          F1 dejó el límite por IP contando a cada cliente (trustProxy loopback); esta fase
--          agrega el estado que el límite por IP no cubre, en MySQL (0 Redis, 417_AN).
--
-- 1) auth_throttle_counters: un contador por llave con ventana. key_hash = HMAC-SHA256 de
--    "<ámbito>:<identificador>" (usuario, par usuario|IP, destinatario de correo): no guarda
--    usuarios, IPs ni correos en claro. Lo usan el freno progresivo del login (429 con
--    Retry-After ≤ 60 s, 0 bloqueo permanente) y el tope de 5 correos por destinatario en 24 h.
-- 2) auth_challenge_nonces: registro de un solo uso de los retos PoW (anti-replay, Cond.R-199
--    P2/P6). Lo consume F3 (ALTCHA); nace aquí porque F3 depende de él (420_AN B1).
-- 3) users.signup_source: origen de la cuenta. Todas las existentes quedan 'admin'; el registro
--    público marcará 'public' (F3) y la purga de F4 solo mira 'public' (420_AN B2, P9).
--
-- MariaDB 10.4 (local) trae explicit_defaults_for_timestamp=0 y 11.8 (prod) =1: todo TIMESTAMP
-- lleva DEFAULT explícito y expires_at es DATETIME, para que ambas creen la misma columna
-- (Regla 23 · R-DB-PARITY). Idempotente: IF NOT EXISTS en tablas y columna.
-- Orden (R-DB-PARITY): PRIMERO local, verificar huella, y DESPUÉS prod vía db-migrations.yml.
-- ============================================================

CREATE TABLE IF NOT EXISTS auth_throttle_counters (
  key_hash CHAR(64) NOT NULL,
  counter INT UNSIGNED NOT NULL DEFAULT 1,
  window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (key_hash),
  INDEX idx_throttle_last_attempt (last_attempt_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_challenge_nonces (
  nonce_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (nonce_hash),
  INDEX idx_nonce_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS signup_source ENUM('admin','public') NOT NULL DEFAULT 'admin' AFTER is_active;

-- Verificación: 2 tablas nuevas y la columna presente (todas las filas existentes en 'admin').
SELECT
  (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name IN ('auth_throttle_counters', 'auth_challenge_nonces')) AS new_tables,
  (SELECT COUNT(*) FROM users WHERE signup_source <> 'admin') AS non_admin_rows;
