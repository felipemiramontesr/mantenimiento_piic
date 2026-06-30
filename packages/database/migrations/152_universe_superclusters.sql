-- ============================================================
-- Migration 152: Universe Superclusters + Tenants FK
-- FC23_Cosmological_Schema_Extension · Fase B
-- PROTOCOLO_L.md V.6.10.0 · §24.2 (Mutabilidad)
-- ============================================================
-- Dependencia: migration 151 aplicada (universe_types + superclusters_catalog)
--
-- Qué hace:
--   1. Agrega universe_type_id FK a tenants + backfill VIM/ERP → FMS
--   2. Crea universe_superclusters (mutabilidad M:N Universo ↔ SC)
--   3. Backfill inicial: cada tenant recibe SC_sistema completo en ACTIVE
--
-- Idempotente: ADD COLUMN IF NOT EXISTS + INSERT IGNORE + IF NOT EXISTS en tabla
-- ============================================================

-- ------------------------------------------------------------
-- PASO 1: Columna universe_type_id en tenants (nullable para backfill seguro)
-- ------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS universe_type_id TINYINT UNSIGNED NULL
  AFTER suite;

-- ------------------------------------------------------------
-- PASO 2: Backfill — mapear suite existente → universe_type_id
--   VIM → FMS  (VIM desaparece del vocabulario · §24.2 D1 resuelta)
--   ERP → FMS  (ambos son Fleet Management)
--   La diferenciación de alcance se controla post-creación via universe_superclusters
-- ------------------------------------------------------------
UPDATE tenants t
JOIN   universe_types ut ON ut.code = 'FMS'
SET    t.universe_type_id = ut.id
WHERE  t.suite IN ('VIM', 'ERP')
  AND  t.universe_type_id IS NULL;

-- ------------------------------------------------------------
-- PASO 3: Aplicar NOT NULL + FK (seguro solo si backfill fue completo)
-- ------------------------------------------------------------
ALTER TABLE tenants
  MODIFY COLUMN universe_type_id TINYINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_tenants_universe_type
    FOREIGN KEY (universe_type_id) REFERENCES universe_types(id);

-- ------------------------------------------------------------
-- PASO 4: Tabla universe_superclusters
--   M:N Universo(Tenant) ↔ Supercúmulo con estados de mutabilidad
--   UNIQUE uq_tenant_sc garantiza que un SC aparece solo una vez por Universo (§24.3)
--   state='SUSPENDED' conserva datos históricos sin nuevas escrituras (§24.2)
--   added_by_user_id NULL = origen migración; user_id de Ω cuando es manual
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS universe_superclusters (
  id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  tenant_id        INT UNSIGNED     NOT NULL,
  supercluster_id  TINYINT UNSIGNED NOT NULL,
  state            ENUM('ACTIVE','SUSPENDED','REMOVED') NOT NULL DEFAULT 'ACTIVE',
  added_at         DATETIME         NOT NULL DEFAULT NOW(),
  removed_at       DATETIME         NULL DEFAULT NULL,
  added_by_user_id INT UNSIGNED     NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tenant_sc (tenant_id, supercluster_id),
  CONSTRAINT fk_us_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_us_sc     FOREIGN KEY (supercluster_id)
    REFERENCES superclusters_catalog(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- PASO 5: Backfill inicial universe_superclusters
--   Cada tenant recibe el blueprint completo de su Universe Type en ACTIVE
--   Blueprint = SC_sistema (5 SCs) — idéntico para FMS/MMS/TMS (§24.2)
--   GrayMan puede ajustar post-migración via UPDATE state='REMOVED'
--   added_by_user_id = NULL indica origen de migración (sistema)
-- ------------------------------------------------------------
INSERT IGNORE INTO universe_superclusters (tenant_id, supercluster_id, state)
SELECT t.id, uts.supercluster_id, 'ACTIVE'
FROM   tenants t
JOIN   universe_type_superclusters uts ON uts.universe_type_id = t.universe_type_id;
