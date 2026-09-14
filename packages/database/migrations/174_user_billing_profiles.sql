-- ============================================================
-- Migration 174: User Billing Profiles — FC177 F1 (Login_Hard_Gate_And_Billing_Schema)
-- Context: Alta pública de usuarios (B2B/B2C) — 311_AN §D2 (Alfa). Al autoregistrarse,
--          el `tenant_id` aún no existe (nace huérfano, sin Universo) — los datos
--          fiscales CFDI 4.0 no pueden insertarse aún en `tenant_profiles` (esa tabla
--          exige `owner_id` NOT NULL). Se persisten aquí como snapshot transitorio de
--          registro; FC177 F3 los COPIA a `tenant_profiles` en la misma TX que vincula
--          el usuario a su Universo (Cond.R-177 R5, Bravo 312_AN).
--
-- Campos CFDI 4.0 (310_AN §6.1, Charlie — investigación de fuentes públicas, NO
-- asesoría fiscal; validar con el contador de GrayMan antes de tratarse como
-- definitivo): rfc/razon_social/regimen_fiscal/codigo_postal_fiscal deben coincidir
-- EXACTO con la Constancia de Situación Fiscal del SAT del receptor; uso_cfdi es el
-- catálogo SAT (default 'S01', sin efectos fiscales, si el usuario no sabe cuál aplica
-- — Cond.R-177 R5 Bravo pide default documentado).
--
-- FK note: `user_id INT NOT NULL` (no UNSIGNED) — coincide con `users.id INT(11)`
-- (signed), verificado en vivo contra el schema real antes de escribir esta migración.
-- Idempotente: CREATE TABLE IF NOT EXISTS.
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS user_billing_profiles (
  user_id               INT           NOT NULL,
  rfc                   VARCHAR(13)   NOT NULL,
  razon_social           VARCHAR(255)  NOT NULL,
  regimen_fiscal         VARCHAR(10)   NOT NULL,
  codigo_postal_fiscal    VARCHAR(10)   NOT NULL,
  uso_cfdi               VARCHAR(10)   NOT NULL DEFAULT 'S01',
  telefono               VARCHAR(20)   NULL,
  created_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_ubp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Verification (ejecutar manualmente post-apply) ──────────────────────────
-- SELECT COUNT(*) FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_billing_profiles';
-- Esperado: 1
