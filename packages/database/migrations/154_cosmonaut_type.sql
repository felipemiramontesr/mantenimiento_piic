-- ============================================================
-- Migration 154: Cosmonaut Type — FC24 Fase A
-- Context: Añade discriminador cosmonaut_type (MU/ARC) por par (user, tenant)
--          en tenant_user_memberships y ancla mu_user_id en tenants.
-- Design: Un usuario puede ser MU en un Universo y ARC en otro (M:N).
--         cosmonaut_type vive en tenant_user_memberships, NO en users.
-- Backfill: role_id IN (1,3,4) → MU · role_id IN (2,5) → ARC
--           Determinismo I1: MIN(user_id) por tenant si hay >1 candidato MU.
-- Idempotent: ADD COLUMN IF NOT EXISTS + UPDATE idempotente en re-ejecución.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── PASO 1: cosmonaut_type en tenant_user_memberships ───────────────────────
ALTER TABLE tenant_user_memberships
  ADD COLUMN IF NOT EXISTS cosmonaut_type ENUM('MU','ARC') NULL
  AFTER assigned_at;

-- ─── PASO 2: Backfill — ARC por defecto para todos los miembros ──────────────
UPDATE tenant_user_memberships tum
JOIN users u ON u.id = tum.user_id
SET tum.cosmonaut_type = 'ARC'
WHERE tum.cosmonaut_type IS NULL;

-- ─── PASO 3: Designar MU — determinista MIN(user_id) por tenant ──────────────
-- role_id IN (1,3,4): Flotilla (ERP admin) · Centro Especializado (VIM admin)
--                     · Propietario Privado (VIM owner)
-- Solo el MIN(user_id) candidato por owner_id queda como MU (I1 enforced)
UPDATE tenant_user_memberships tum
JOIN (
  SELECT MIN(tum2.user_id) AS mu_uid, tum2.owner_id
  FROM tenant_user_memberships tum2
  JOIN users u2 ON u2.id = tum2.user_id
  WHERE u2.role_id IN (1, 3, 4)
  GROUP BY tum2.owner_id
) designated ON tum.user_id  = designated.mu_uid
            AND tum.owner_id = designated.owner_id
SET tum.cosmonaut_type = 'MU';

-- ─── PASO 4: mu_user_id en tenants ───────────────────────────────────────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS mu_user_id INT NULL
  AFTER universe_type_id;

-- ─── PASO 5: Backfill mu_user_id ─────────────────────────────────────────────
UPDATE tenants t
JOIN tenant_user_memberships tum ON tum.owner_id = t.id
                                AND tum.cosmonaut_type = 'MU'
SET t.mu_user_id = tum.user_id
WHERE t.mu_user_id IS NULL;

-- ─── PASO 6: FK constraint mu_user_id → users(id) ────────────────────────────
ALTER TABLE tenants
  ADD CONSTRAINT fk_tenants_mu_user
    FOREIGN KEY (mu_user_id) REFERENCES users(id) ON DELETE RESTRICT;

SET FOREIGN_KEY_CHECKS = 1;

-- ─── Verification queries (ejecutar manualmente post-apply) ──────────────────
-- Verificar I1 — exactamente 1 MU por tenant:
-- SELECT owner_id, COUNT(*) AS mu_count FROM tenant_user_memberships
-- WHERE cosmonaut_type='MU' GROUP BY owner_id HAVING mu_count > 1;
-- Expected: 0 rows

-- Verificar distribución:
-- SELECT cosmonaut_type, COUNT(*) FROM tenant_user_memberships GROUP BY cosmonaut_type;

-- Verificar mu_user_id poblado:
-- SELECT COUNT(*) FROM tenants WHERE mu_user_id IS NULL;
-- Expected: 0
