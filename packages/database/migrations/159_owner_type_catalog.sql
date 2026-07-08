SET NAMES utf8mb4;

-- ============================================================
-- Migration 159: Owner Type Catalog (ENUM → catálogo + FK)
-- FC 067 Universe_Onboarding_Foundations · Fase 1
-- PROTOCOLO_L.md V.6.14.2 · §23 (3NF/idempotencia) · §24.2 (extensibilidad por Ω)
-- ============================================================
-- Terreno (149): la tabla física es `tenants`; `owners` es una vista de
-- compatibilidad `SELECT * FROM tenants` — se re-emite al final para que
-- refleje el cambio de columnas y siga siendo insertable.
--
-- Qué hace:
--   1. Crea owner_types_catalog (FLOTILLA/PRIVATE/CENTER/ARCHONAUT)
--      — mismo patrón que universe_types (151): nuevo tipo = INSERT, sin ALTER.
--   2. Agrega tenants.owner_type_id (FK) + backfill desde el ENUM legacy.
--   3. Fail-closed: NOT NULL falla si queda algún tenant sin mapear.
--   4. Elimina la columna ENUM owner_type tras el backfill verificado.
--   5. Recrea la vista owners (CREATE OR REPLACE — idempotente, patrón 149).
--
-- Idempotente: CREATE/ADD/DROP con IF [NOT] EXISTS + backfill guardado por
-- information_schema vía PREPARE (segunda ejecución = no-op, la columna legacy ya no existe).
-- Compatible MariaDB 10.4 (local) y 11.8 (PROD).
-- ============================================================

-- ------------------------------------------------------------
-- PASO 1: Catálogo de tipos de Owner — extensible solo por Ω
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS owner_types_catalog (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(20)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT         NULL,
  created_at  DATETIME     NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_owner_type_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO owner_types_catalog (code, name, description) VALUES
  ('FLOTILLA',  'Propietario de Flotilla',  'Owner raíz de Universo ERP — administra flotilla completa'),
  ('PRIVATE',   'Propietario Privado',      'Sub-usuario bajo un owner padre (parent_owner_id) — semántica original intacta'),
  ('CENTER',    'Centro Especializado',     'Owner raíz de Universo VIM — taller/centro de servicio'),
  ('ARCHONAUT', 'Archonaut / ARC Itinerante', 'Nodo consumidor individual top-level — sin supercúmulos de negocio salvo Finanzas (gasto personal), opera vía L_social y lattices efímeros (FC 067)');

-- ------------------------------------------------------------
-- PASO 2: Columna FK en tenants (nullable para backfill seguro)
-- ------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS owner_type_id TINYINT UNSIGNED NULL AFTER id;

-- ------------------------------------------------------------
-- PASO 3: Backfill desde el ENUM legacy — guardado por information_schema
--   (segunda ejecución: la columna owner_type ya no existe → no-op)
-- ------------------------------------------------------------
SET @has_legacy := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'owner_type'
);
SET @sql := IF(@has_legacy = 1,
  'UPDATE tenants t JOIN owner_types_catalog otc ON otc.code = t.owner_type SET t.owner_type_id = otc.id WHERE t.owner_type_id IS NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- PASO 4: NOT NULL — FAIL-CLOSED: si algún tenant quedó sin mapear,
--   este ALTER aborta y la columna legacy NO se elimina (Scenario 1)
-- ------------------------------------------------------------
ALTER TABLE tenants
  MODIFY COLUMN owner_type_id TINYINT UNSIGNED NOT NULL;

-- ------------------------------------------------------------
-- PASO 5: Índice + FK (recomendación Bravo — índice explícito en la FK)
-- ------------------------------------------------------------
ALTER TABLE tenants
  ADD INDEX IF NOT EXISTS idx_tenants_owner_type_id (owner_type_id);
SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants'
    AND CONSTRAINT_NAME = 'fk_tenants_owner_type' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk = 0,
  'ALTER TABLE tenants ADD CONSTRAINT fk_tenants_owner_type FOREIGN KEY (owner_type_id) REFERENCES owner_types_catalog(id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- PASO 6: Eliminar el ENUM legacy — solo se alcanza si el backfill
--   fue completo (PASO 4 no abortó)
-- ------------------------------------------------------------
ALTER TABLE tenants
  DROP COLUMN IF EXISTS owner_type;

-- ------------------------------------------------------------
-- PASO 7: Recrear la vista de compatibilidad (patrón 149 — idempotente,
--   SELECT * de una sola tabla base: sigue siendo insertable)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW owners AS SELECT * FROM tenants;

-- ------------------------------------------------------------
-- Verificación (contadores agregados — Scenarios 1 y 3)
-- ------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM owner_types_catalog)                                  AS owner_types_total,
  (SELECT COUNT(*) FROM owner_types_catalog WHERE code = 'ARCHONAUT')         AS archonaut_present,
  (SELECT COUNT(*) FROM tenants WHERE owner_type_id IS NULL)                  AS tenants_orphans,
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='tenants'
     AND COLUMN_NAME='owner_type')                                            AS legacy_enum_remaining;
