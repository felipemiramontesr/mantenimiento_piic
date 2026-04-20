-- =============================================================================
-- Migration: 012 - Fix Fleet Status Integrity
-- Version: 28.18.1
-- Description: Repair ASM-013 empty status and enforce NOT NULL constraints.
-- =============================================================================

-- 1. HEALING: Update all units with empty or null status to 'Disponible'
-- This fixes the data discrepancy in the Archon Center dashboard.
UPDATE fleet_units 
SET status = 'Disponible' 
WHERE status IS NULL OR status = '' OR TRIM(status) = '';

-- 2. FORTIFICATION: Enforce schema constraints
-- Ensures no future unit can enter the system without a valid status.
ALTER TABLE fleet_units 
MODIFY status VARCHAR(50) NOT NULL DEFAULT 'Disponible';

-- 3. VERIFICATION
-- Confirming the fix for unit ASM-013.
SELECT id, status FROM fleet_units WHERE id = 'ASM-013';
