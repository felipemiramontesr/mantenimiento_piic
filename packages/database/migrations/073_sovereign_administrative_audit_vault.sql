-- =============================================================================
-- Migration: 073 - Sovereign Administrative Audit Vault
-- Architecture: Black-Box Forensic Recording
-- Description: Establishes the immutable trace for all administrative actions (CRUD).
-- =============================================================================

CREATE TABLE IF NOT EXISTS administrative_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(100) NOT NULL, -- e.g., 'route_log', 'user', 'fleet_unit'
  entity_id VARCHAR(100) NOT NULL,
  action ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  snapshot_before JSON,
  snapshot_after JSON,
  reason TEXT NOT NULL,
  user_id INT, -- The admin who performed the action
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexing for forensic performance
CREATE INDEX idx_audit_entity ON administrative_audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON administrative_audit_logs(user_id);
CREATE INDEX idx_audit_created ON administrative_audit_logs(created_at);
