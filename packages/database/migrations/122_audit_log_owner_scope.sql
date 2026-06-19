-- =============================================================================
-- Migration: 122 - Audit Log Owner Scope
-- Architecture: Archon_Security_AuditLog · Fase 1
-- Description: Adds owner_id to administrative_audit_logs for universe-scoped
--              visibility. Nullable for backwards compatibility with existing rows.
-- =============================================================================

SET NAMES utf8mb4;

ALTER TABLE administrative_audit_logs
  ADD COLUMN owner_id INT NULL AFTER user_id,
  ADD CONSTRAINT fk_audit_owner
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL;

CREATE INDEX idx_audit_owner ON administrative_audit_logs(owner_id);
