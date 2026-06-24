-- Migration 142: CRM Pipeline de Negociaciones
-- FC-8 CRM_Advanced_Modules FaseB
-- Idempotent: CREATE TABLE IF NOT EXISTS + INSERT IGNORE

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id       TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code     VARCHAR(20)      NOT NULL,
  label    VARCHAR(50)      NOT NULL,
  position TINYINT UNSIGNED NOT NULL,
  color    VARCHAR(20)      NOT NULL DEFAULT '#64748b',
  UNIQUE KEY uq_crm_stage_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO crm_pipeline_stages (code, label, position, color) VALUES
  ('PROSPECTING', 'Prospección',  1, '#6366f1'),
  ('QUALIFYING',  'Calificación', 2, '#3b82f6'),
  ('PROPOSAL',    'Propuesta',    3, '#f59e0b'),
  ('NEGOTIATING', 'Negociación',  4, '#f97316'),
  ('CLOSED_WON',  'Ganado',       5, '#10b981'),
  ('CLOSED_LOST', 'Perdido',      6, '#ef4444');

CREATE TABLE IF NOT EXISTS crm_opportunities (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  owner_id        INT              NOT NULL,
  stage_id        TINYINT UNSIGNED NOT NULL DEFAULT 1,
  title           VARCHAR(255)     NOT NULL,
  value_mxn       DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
  probability_pct TINYINT UNSIGNED NOT NULL DEFAULT 50,
  assigned_to     INT              NULL,
  notes           TEXT             NULL,
  created_by      INT              NOT NULL,
  created_at      TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_crm_opp_owner (owner_id),
  INDEX idx_crm_opp_stage (stage_id),
  CONSTRAINT fk_crm_opp_owner       FOREIGN KEY (owner_id)    REFERENCES owners(id),
  CONSTRAINT fk_crm_opp_stage       FOREIGN KEY (stage_id)    REFERENCES crm_pipeline_stages(id),
  CONSTRAINT fk_crm_opp_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id),
  CONSTRAINT fk_crm_opp_created_by  FOREIGN KEY (created_by)  REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
