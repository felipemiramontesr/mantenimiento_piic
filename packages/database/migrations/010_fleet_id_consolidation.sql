-- =============================================================================
-- Migration: 010 - Fleet ID & Tag Consolidation
-- Architecture: Archon Collective v.18.9.0
-- Goal: Merge 'id' and 'tag' into a single user-defined primary key.
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. DROP EXISTING CONSTRAINTS
ALTER TABLE fleet_maintenance_logs DROP FOREIGN KEY fleet_maintenance_logs_ibfk_1;
ALTER TABLE fleet_route_logs DROP FOREIGN KEY fleet_route_logs_ibfk_1;

-- 2. SHIFT PRIMARY KEY STRUCTURE
-- First, expand ID to support ASM-XXX format
ALTER TABLE fleet_units MODIFY COLUMN id VARCHAR(50) NOT NULL;

-- Drop the redundant tag column
-- Note: In a clean DB, we assume tag data is not needed or already migrated to ID.
ALTER TABLE fleet_units DROP COLUMN tag;

-- 3. UPDATE RELATED TABLES UNIT_ID WIDTH
ALTER TABLE fleet_maintenance_logs MODIFY COLUMN unit_id VARCHAR(50) NOT NULL;
ALTER TABLE fleet_route_logs MODIFY COLUMN unit_id VARCHAR(50) NOT NULL;

-- 4. RESTORE INTEGRITY
ALTER TABLE fleet_maintenance_logs 
ADD CONSTRAINT fk_mlog_unit 
FOREIGN KEY (unit_id) REFERENCES fleet_units(id) ON DELETE CASCADE;

ALTER TABLE fleet_route_logs 
ADD CONSTRAINT fk_rlog_unit 
FOREIGN KEY (unit_id) REFERENCES fleet_units(id) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- MIGRATION COMPLETE: Identity Unification v.18.9.0
-- =============================================================================
