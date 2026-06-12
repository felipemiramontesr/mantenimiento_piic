-- =============================================================================
-- Migration: 077 - Archon Odometer Normalization (Industrial Integrity)
-- Architecture: Archon Collective v.20.1.0
-- Goal: Eliminate redundancy between 'odometer' and 'currentReading'.
-- =============================================================================

-- ── 1. DATA CONSOLIDATION ───────────────────────────────────────────────────
-- Ensure odometer has the most recent reading from currentReading if it exists.
UPDATE fleet_units 
SET odometer = currentReading 
WHERE currentReading > odometer OR odometer = 0;

-- ── 2. SCHEMA SIMPLIFICATION ─────────────────────────────────────────────────
-- Drop the redundant currentReading column.
ALTER TABLE fleet_units DROP COLUMN currentReading;

-- ── 3. METADATA ENHANCEMENT ──────────────────────────────────────────────────
ALTER TABLE fleet_units 
MODIFY COLUMN odometer DECIMAL(12,2) NOT NULL DEFAULT 0.00 
COMMENT 'Master asset reading (KM for vehicles, HRS for machinery)';

-- ── 4. VERIFICATION ──────────────────────────────────────────────────────────
-- No action needed, integrity enforced by single source of truth.
