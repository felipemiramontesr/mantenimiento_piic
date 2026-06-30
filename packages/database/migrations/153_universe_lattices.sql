-- ============================================================
-- Migration 153: Universe Lattices
-- FC23_Cosmological_Schema_Extension · Fase C
-- PROTOCOLO_L.md V.6.10.0 · §24.8 / §24.11
-- ============================================================
-- Dependencia: migration 152 aplicada (universe_superclusters + tenants.universe_type_id)
--
-- Qué hace:
--   Crea universe_lattices — gateways B2B persistentes entre Universos (§24.8)
--   L = L_bilateral ∪ {L_social}
--     L_bilateral : u1_tenant_id ≠ u2_tenant_id (ambos NOT NULL)
--     L_social    : u2_tenant_id = NULL (Lattice global — ∀ u ∈ U participa)
--
-- Sin backfill — no existen Lattices activos en el sistema todavía.
-- Idempotente: CREATE TABLE IF NOT EXISTS
-- ============================================================

-- ------------------------------------------------------------
-- universe_lattices
--   Implementa L_bilateral y la fila especial de L_social (§24.11)
--
--   u2_tenant_id NULL = L_social (Lattice global Ω-managed)
--   ON DELETE RESTRICT en FKs: no se puede eliminar un tenant
--     con Lattices activos sin cerrarlos primero
--   CHECK u1 ≠ u2 OR u2 IS NULL: anti-autoreferencial (§24.8)
--     permite NULL para L_social
--   UNIQUE uq_lattice_pair: un solo Lattice de cada tipo
--     entre el mismo par de Universos (u2 NULL incluido)
--   authorized_by NULL = propuesto pero pendiente de autorización Ω
--   schema_definition JSON: contrato de datos flexible (evoluciona sin migraciones)
--   Axioma de no-proliferación: view_via_lattice ≠ copy(data) — §24.8
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS universe_lattices (
  id                BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  u1_tenant_id      INT              NOT NULL,
  u2_tenant_id      INT              NULL DEFAULT NULL,
  lattice_type      ENUM('SERVICE_EXTERNAL','MARKETPLACE','SYSTEMIC') NOT NULL,
  schema_definition JSON             NOT NULL,
  state             ENUM('ACTIVE','SUSPENDED','CLOSED') NOT NULL DEFAULT 'ACTIVE',
  opened_at         DATETIME         NOT NULL DEFAULT NOW(),
  closed_at         DATETIME         NULL DEFAULT NULL,
  authorized_by     INT UNSIGNED     NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lattice_pair (u1_tenant_id, u2_tenant_id, lattice_type),
  CONSTRAINT fk_lattice_u1 FOREIGN KEY (u1_tenant_id)
    REFERENCES tenants(id) ON DELETE RESTRICT,
  CONSTRAINT fk_lattice_u2 FOREIGN KEY (u2_tenant_id)
    REFERENCES tenants(id) ON DELETE RESTRICT,
  CONSTRAINT chk_lattice_different_tenants
    CHECK (u1_tenant_id <> u2_tenant_id OR u2_tenant_id IS NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
