SET NAMES utf8mb4;

-- ===========================================================================
-- Migration: 144 — campaign_templates
-- FC-8 CRM_Advanced_Modules FaseE — Módulo de Campañas y Envío Outbox
-- Stores sanitized email campaign templates per owner.
-- Send→Outbox: INSERT into notifications_outbox (async, non-blocking).
-- PII in subject/body_text is blocked server-side before INSERT.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS campaign_templates (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  owner_id    INT NOT NULL,
  name        VARCHAR(255) NOT NULL,
  subject     VARCHAR(255) NOT NULL,
  body_text   TEXT NOT NULL,
  type        ENUM('CONTRACT_EXPIRY','MAINTENANCE_REMINDER','QUOTATION')
              NOT NULL DEFAULT 'MAINTENANCE_REMINDER',
  created_by  INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_camp_owner   (owner_id),
  INDEX idx_camp_type    (type),
  INDEX idx_camp_created (created_at),

  CONSTRAINT fk_camp_owner   FOREIGN KEY (owner_id)   REFERENCES owners(id) ON DELETE CASCADE,
  CONSTRAINT fk_camp_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
