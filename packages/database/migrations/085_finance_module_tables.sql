-- =============================================================================
-- Migration: 085 — Finance Module: Core Ledger Table
-- Creates financial_transactions as the central egress ledger for fleet costs.
-- Idempotent: uses IF NOT EXISTS.
-- Fiscal period: año calendario (enero-diciembre) per SAT/CFF Art. 11.
-- =============================================================================

CREATE TABLE IF NOT EXISTS financial_transactions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36)      NOT NULL UNIQUE,
  unit_id         VARCHAR(50)   NOT NULL,
  category        ENUM(
                    'LEASE',
                    'INSURANCE',
                    'MAINTENANCE',
                    'FUEL',
                    'TIRE',
                    'FINE',
                    'REPAIR',
                    'OTHER'
                  )             NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  period          CHAR(7)       NOT NULL  COMMENT 'YYYY-MM — año calendario SAT/CFF Art.11',
  source          ENUM('AUTO','MANUAL') NOT NULL DEFAULT 'MANUAL',
  source_uuid     CHAR(36)      NULL      COMMENT 'UUID del fleet_movement origen cuando source=AUTO',
  vendor          VARCHAR(150)  NULL,
  invoice_ref     VARCHAR(80)   NULL,
  notes           TEXT          NULL,
  created_by      INT(11)       NOT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_unit_period   (unit_id, period),
  INDEX idx_cat_period    (category, period),
  INDEX idx_period        (period),
  INDEX idx_source_uuid   (source_uuid),

  FOREIGN KEY (unit_id)    REFERENCES fleet_units(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id)       ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
