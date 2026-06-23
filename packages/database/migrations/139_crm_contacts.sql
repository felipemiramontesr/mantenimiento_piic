-- Migration 139: CRM Contacts Directory
-- FC-5 CRM_Directory_Contacts FaseA
-- Creates crm_contacts table with AES-256 PII fields + EAL6+ owner_id scoping.
-- PII fields (email, phone) stored encrypted via EncryptionService (AES-256-GCM).
-- Blind index on email_bi for deterministic lookup without exposing plaintext.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS crm_contacts (
  id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  owner_id        INT              NOT NULL,
  full_name       VARCHAR(255)     NOT NULL COMMENT 'Display name, not encrypted',
  company         VARCHAR(255)     NULL     COMMENT 'Company / organization name',
  role_label      VARCHAR(100)     NULL     COMMENT 'Job title or relationship role',
  email           TEXT             NULL     COMMENT 'AES-256-GCM encrypted PII',
  email_bi        VARCHAR(30)      NULL     COMMENT 'Blind index: SVR-UPPER(LEFT(SHA2(email,256),16))',
  phone           TEXT             NULL     COMMENT 'AES-256-GCM encrypted PII',
  notes           TEXT             NULL     COMMENT 'Plain text notes (non-PII)',
  is_active       TINYINT(1)       NOT NULL DEFAULT 1,
  created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_crm_owner        (owner_id),
  INDEX idx_crm_email_bi     (email_bi),
  INDEX idx_crm_active       (is_active),
  CONSTRAINT fk_crm_owner FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
