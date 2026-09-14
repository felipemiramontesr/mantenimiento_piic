-- ============================================================
-- Migration 175: Tenant Profiles Fiscal Fields — FC177 F3 (Cosmology_Universe_User_Linking_Backend)
-- Context: al vincular un usuario en cuarentena a un Universo, F3 copia su snapshot fiscal
--          (migración 174, `user_billing_profiles`) a `tenant_profiles`. Esa tabla ya tenía
--          rfc/razon_social/telefono (migración 149-era), pero no `regimen_fiscal` ni
--          `uso_cfdi` — ambos capturados en el alta pública (FC177 F2) y sin destino aquí.
-- Deliberadamente NO se agrega/copia un `codigo_postal_fiscal` crudo: `tenant_profiles` ya
-- modela geografía vía `neighborhood_id` (FK a catálogo), un modelo estructuralmente distinto
-- a un CP suelto — mapear uno a otro exigiría una búsqueda/match contra `neighborhoods` fuera
-- del alcance de F3. El dato no se pierde: `user_billing_profiles` conserva el snapshot
-- original de forma permanente (no se borra al vincular).
-- NULLABLE — mismo criterio que el resto de columnas fiscales de `tenant_profiles`, que ya se
-- tratan como opcionales (pobladas post-alta vía self-service PATCH /owners/me/profile).
-- Idempotente: ADD COLUMN IF NOT EXISTS.
-- ============================================================

SET NAMES utf8mb4;

ALTER TABLE tenant_profiles
  ADD COLUMN IF NOT EXISTS regimen_fiscal VARCHAR(10) NULL AFTER razon_social,
  ADD COLUMN IF NOT EXISTS uso_cfdi VARCHAR(10) NULL AFTER regimen_fiscal;

-- ─── Verification (ejecutar manualmente post-apply) ──────────────────────────
-- DESCRIBE tenant_profiles;
-- Esperado: regimen_fiscal y uso_cfdi presentes, ambos NULL-able, justo después de razon_social.
