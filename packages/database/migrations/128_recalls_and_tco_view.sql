SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 128 — VIM Perfect Universe: Recalls N:M + TCO View
-- Creates:
--   catalog_recalls       — global recall catalog per make/model/year
--   fleet_unit_recalls    — N:M status of each recall per individual unit
--   view_fleet_units_tco  — real-time TCO aggregated from financial_transactions
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE VIEW.
-- =============================================================================

-- ─── 1. catalog_recalls ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalog_recalls (
  id            INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  campaign_code VARCHAR(50)    NOT NULL                  COMMENT 'Código único de campaña del fabricante',
  description   TEXT           NOT NULL                  COMMENT 'Descripción del defecto y acción correctiva',
  make          VARCHAR(50)    NOT NULL                  COMMENT 'Fabricante (e.g. NISSAN, TOYOTA)',
  model         VARCHAR(100)   NOT NULL                  COMMENT 'Modelo afectado (e.g. NP300)',
  year          YEAR           NOT NULL                  COMMENT 'Año modelo afectado',
  published_date DATE          NOT NULL                  COMMENT 'Fecha de publicación oficial del recall',
  created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_campaign_code (campaign_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Catálogo global de recalls/campañas de fabricante — un recall puede afectar N unidades del mismo modelo/año';

-- ─── 2. fleet_unit_recalls ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fleet_unit_recalls (
  fleet_unit_id VARCHAR(20)   NOT NULL                  COMMENT 'FK a fleet_units.id',
  recall_id     INT UNSIGNED  NOT NULL                  COMMENT 'FK a catalog_recalls.id',
  status        ENUM(
                  'PENDING',
                  'COMPLETED',
                  'NOT_APPLICABLE'
                )             NOT NULL DEFAULT 'PENDING' COMMENT 'Estado del recall en esta unidad específica',
  resolved_at   DATE          NULL                      COMMENT 'Fecha de resolución (NULL si status != COMPLETED)',
  work_order_id INT UNSIGNED  NULL                      COMMENT 'FK opcional a upa_work_orders para trazabilidad física',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (fleet_unit_id, recall_id),
  CONSTRAINT fk_fur_unit   FOREIGN KEY (fleet_unit_id) REFERENCES fleet_units(id)     ON DELETE CASCADE,
  CONSTRAINT fk_fur_recall FOREIGN KEY (recall_id)     REFERENCES catalog_recalls(id)  ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Estado N:M de cada recall por unidad individual (un recall puede afectar múltiples unidades, una unidad puede tener múltiples recalls)';

-- ─── 3. view_fleet_units_tco ─────────────────────────────────────────────────
-- TCO en tiempo real: SUM(financial_transactions.amount) agrupado por unidad.
-- Aislamiento EAL6+: suite derivada de owners.suite via JOIN (no columna directa en fleet_units).
-- Columna ownerId en fleet_units es camelCase (codebase legacy).
CREATE OR REPLACE VIEW view_fleet_units_tco AS
SELECT
  fu.id                                                                               AS fleet_unit_id,
  fu.ownerId                                                                          AS owner_id,
  o.suite,
  COALESCE(SUM(ft.amount), 0.00)                                                     AS tco_total,
  COALESCE(SUM(CASE WHEN ft.category = 'MAINTENANCE'  THEN ft.amount ELSE 0 END), 0.00) AS tco_maintenance,
  COALESCE(SUM(CASE WHEN ft.category = 'INSURANCE'    THEN ft.amount ELSE 0 END), 0.00) AS tco_insurance,
  COALESCE(SUM(CASE WHEN ft.category = 'LEASE'        THEN ft.amount ELSE 0 END), 0.00) AS tco_lease,
  COALESCE(SUM(CASE WHEN ft.category = 'TENENCIA'     THEN ft.amount ELSE 0 END), 0.00) AS tco_tenencia,
  COALESCE(SUM(CASE WHEN ft.category = 'VERIFICACION' THEN ft.amount ELSE 0 END), 0.00) AS tco_verificacion,
  COALESCE(SUM(CASE WHEN ft.category = 'FUEL'         THEN ft.amount ELSE 0 END), 0.00) AS tco_fuel,
  COALESCE(SUM(CASE WHEN ft.category = 'OTHER'        THEN ft.amount ELSE 0 END), 0.00) AS tco_other,
  COUNT(ft.id)                                                                        AS total_records,
  MAX(ft.created_at)                                                                  AS last_record_at
FROM fleet_units fu
JOIN owners o ON fu.ownerId = o.id
LEFT JOIN financial_transactions ft ON ft.unit_id = fu.id
GROUP BY fu.id, fu.ownerId, o.suite;
