SET NAMES utf8mb4;

-- ============================================================
-- Migration 161: Clusters Catalog (nivel Cúmulo) + Finanzas MVP
-- FC 067 Universe_Onboarding_Foundations · Fase 4
-- PROTOCOLO_L.md V.6.14.2 · §24.3 (Supercúmulos y Cúmulos) · §24.0.4
-- ============================================================
-- Dependencia: migrations 151/152 aplicadas (superclusters_catalog +
-- universe_superclusters ya sembrados).
--
-- Qué hace:
--   1. Introduce el nivel Cúmulo en el esquema (§24.3 — hasta hoy puramente
--      formal, sin tabla): clusters_catalog, pertenencia exclusiva 1:1 a un SC.
--   2. Crea universe_clusters — mutabilidad M:N Universo↔Cúmulo, mismo patrón
--      que universe_superclusters (152): ACTIVE/SUSPENDED/REMOVED por tenant.
--   3. Siembra el único Cúmulo del MVP: GASTOS_EGRESOS bajo FINANZAS, mapeado
--      1:1 al `financial_transactions` ya existente (085+127).
--   4. Backfill: todo tenant con FINANZAS ACTIVE en universe_superclusters
--      recibe GASTOS_EGRESOS ACTIVE en universe_clusters — CERO regresión
--      para tenants existentes (T1 pasa automáticamente).
--
-- Idempotente: CREATE TABLE IF NOT EXISTS + INSERT IGNORE + lookup por code.
-- ============================================================

-- ------------------------------------------------------------
-- PASO 1: Catálogo de Cúmulos — pertenencia exclusiva a un Supercúmulo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clusters_catalog (
  id              TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  supercluster_id TINYINT UNSIGNED NOT NULL,
  code            VARCHAR(40)  NOT NULL,
  name            VARCHAR(100) NOT NULL,
  perm_prefix     VARCHAR(20)  NOT NULL,
  description     TEXT         NULL,
  created_at      DATETIME     NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cluster_code (code),
  CONSTRAINT fk_cluster_sc FOREIGN KEY (supercluster_id)
    REFERENCES superclusters_catalog(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO clusters_catalog (supercluster_id, code, name, perm_prefix, description)
SELECT sc.id, 'GASTOS_EGRESOS', 'Gastos y Egresos', 'finance',
       'Ledger de egresos (financial_transactions) — categorías LEASE/INSURANCE/MAINTENANCE/FUEL/TIRE/FINE/REPAIR/TENENCIA/VERIFICACION/OTHER. Archonaut ve subconjunto personal (sin LEASE/FINE).'
FROM   superclusters_catalog sc
WHERE  sc.code = 'FINANZAS';

-- ------------------------------------------------------------
-- PASO 2: Mutabilidad Universo↔Cúmulo (mismo patrón que 152)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS universe_clusters (
  id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  tenant_id        INT              NOT NULL,
  cluster_id       TINYINT UNSIGNED NOT NULL,
  state            ENUM('ACTIVE','SUSPENDED','REMOVED') NOT NULL DEFAULT 'ACTIVE',
  added_at         DATETIME         NOT NULL DEFAULT NOW(),
  removed_at       DATETIME         NULL DEFAULT NULL,
  added_by_user_id INT UNSIGNED     NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tenant_cluster (tenant_id, cluster_id),
  CONSTRAINT fk_uc_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_uc_cluster FOREIGN KEY (cluster_id)
    REFERENCES clusters_catalog(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- PASO 3: Backfill — todo tenant con FINANZAS ACTIVE recibe GASTOS_EGRESOS ACTIVE
-- ------------------------------------------------------------
INSERT IGNORE INTO universe_clusters (tenant_id, cluster_id, state)
SELECT us.tenant_id, cc.id, 'ACTIVE'
FROM   universe_superclusters us
JOIN   superclusters_catalog sc ON sc.id = us.supercluster_id AND sc.code = 'FINANZAS'
JOIN   clusters_catalog cc ON cc.code = 'GASTOS_EGRESOS'
WHERE  us.state = 'ACTIVE';

-- ------------------------------------------------------------
-- Verificación (contadores agregados)
-- ------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM clusters_catalog)                         AS clusters_total,
  (SELECT COUNT(*) FROM clusters_catalog WHERE code='GASTOS_EGRESOS') AS gastos_egresos_present,
  (SELECT COUNT(*) FROM universe_clusters WHERE state='ACTIVE')   AS universe_clusters_active,
  (SELECT COUNT(*) FROM universe_superclusters us
     JOIN superclusters_catalog sc ON sc.id=us.supercluster_id AND sc.code='FINANZAS'
     WHERE us.state='ACTIVE') AS tenants_finanzas_active_baseline;
