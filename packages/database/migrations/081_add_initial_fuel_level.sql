-- 🔱 ARCHON FUEL LEVEL TRACKING & BACKFILL MIGRATION
-- Add initialFuelLevel and lastFuelLevel (if missing) to fleet_units aligning with fleet_routes
-- MariaDB 10.4.32 Idempotent Execution

START TRANSACTION;

-- 1. Alter Table: Add columns safely using IF NOT EXISTS (MariaDB 10.2+)
ALTER TABLE fleet_units 
ADD COLUMN IF NOT EXISTS initialFuelLevel DECIMAL(5,2) DEFAULT 100.00 AFTER odometer,
ADD COLUMN IF NOT EXISTS lastFuelLevel DECIMAL(5,2) DEFAULT 100.00 AFTER initialFuelLevel;

-- 2. Backfill: initialFuelLevel from first recorded route's start fuel level
UPDATE fleet_units u
SET u.initialFuelLevel = COALESCE(
  (
    SELECT r.fuel_level_start
    FROM fleet_routes r
    WHERE r.unit_id COLLATE utf8mb4_general_ci = u.id
    ORDER BY r.start_at ASC, r.id ASC
    LIMIT 1
  ),
  100.00
);

-- 3. Backfill: lastFuelLevel from latest completed route's end fuel level
UPDATE fleet_units u
SET u.lastFuelLevel = COALESCE(
  (
    SELECT r.fuel_level_end
    FROM fleet_routes r
    WHERE r.unit_id COLLATE utf8mb4_general_ci = u.id AND r.status COLLATE utf8mb4_general_ci = 'COMPLETED'
    ORDER BY r.end_at DESC, r.id DESC
    LIMIT 1
  ),
  u.initialFuelLevel,
  100.00
);

COMMIT;
