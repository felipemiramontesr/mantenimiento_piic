-- Migration 148: Fix crm_interactions.contact_id FK type
-- FC-12 SchemaIntegrity_Repair
-- Aligns contact_id type with crm_contacts.id (INT UNSIGNED AUTO_INCREMENT).
-- Idempotente: MODIFY COLUMN es no-op si el tipo ya es correcto.

SET NAMES utf8mb4;

ALTER TABLE crm_interactions
  MODIFY COLUMN contact_id INT UNSIGNED NULL;
