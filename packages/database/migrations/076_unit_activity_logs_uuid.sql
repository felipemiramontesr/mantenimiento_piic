-- =============================================================================
-- Migration: 076 - Unit Activity Logs Universal Identity
-- Architecture: PIIC Sovereign Forensic System
-- Description: Adds a UUID to every activity log entry to ensure global 
-- uniqueness and eliminate dependency on incremental IDs.
-- =============================================================================

-- 1. Add the uuid column (nullable initially to allow population)
ALTER TABLE unit_activity_logs ADD COLUMN uuid CHAR(36) AFTER id;
ALTER TABLE administrative_audit_logs ADD COLUMN uuid CHAR(36) AFTER id;

-- 2. Populate existing rows with random UUIDs
UPDATE unit_activity_logs SET uuid = (SELECT UUID());
UPDATE administrative_audit_logs SET uuid = (SELECT UUID());

-- 3. Set constraints
ALTER TABLE unit_activity_logs MODIFY COLUMN uuid CHAR(36) NOT NULL;
CREATE UNIQUE INDEX uq_activity_log_uuid ON unit_activity_logs(uuid);

ALTER TABLE administrative_audit_logs MODIFY COLUMN uuid CHAR(36) NOT NULL;
CREATE UNIQUE INDEX uq_audit_log_uuid ON administrative_audit_logs(uuid);
