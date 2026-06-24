-- Migration 141: CRM Contracts + SLAs
-- FC-8 CRM_Advanced_Modules FaseA
-- Idempotent: CREATE TABLE IF NOT EXISTS

CREATE TABLE IF NOT EXISTS crm_contracts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  owner_id    INT NOT NULL,
  unit_id     VARCHAR(20) NULL,
  title       VARCHAR(255) NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  sla_hours   TINYINT UNSIGNED NOT NULL DEFAULT 24,
  status      ENUM('DRAFT','ACTIVE','EXPIRED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  notes       TEXT NULL,
  created_by  INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_crm_contracts_owner  (owner_id),
  INDEX idx_crm_contracts_status (status),
  CONSTRAINT fk_crm_contracts_owner      FOREIGN KEY (owner_id)   REFERENCES owners(id),
  CONSTRAINT fk_crm_contracts_unit       FOREIGN KEY (unit_id)    REFERENCES fleet_units(id),
  CONSTRAINT fk_crm_contracts_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
