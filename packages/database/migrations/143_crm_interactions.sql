-- Migration 143: CRM Bitácora Forense de Interacciones
-- FC-8 CRM_Advanced_Modules FaseC
-- Idempotent: CREATE TABLE IF NOT EXISTS
-- No columna is_sanitized (AG: validación 100% server-side Fastify)

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS crm_interactions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  owner_id   INT  NOT NULL,
  contact_id INT  NULL,
  type       ENUM('CALL','EMAIL','NOTE','MEETING') NOT NULL DEFAULT 'NOTE',
  summary    TEXT NOT NULL,
  created_by INT  NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_crm_inter_owner   (owner_id),
  INDEX idx_crm_inter_contact (contact_id),
  INDEX idx_crm_inter_created (created_at),
  CONSTRAINT fk_crm_inter_owner      FOREIGN KEY (owner_id)   REFERENCES owners(id),
  CONSTRAINT fk_crm_inter_contact    FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  CONSTRAINT fk_crm_inter_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
