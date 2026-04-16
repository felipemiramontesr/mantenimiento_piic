-- 🛡️ ARCHON SENTINEL: Blind Identity Migration (v.12.0.0)
-- Purpose: Enable encrypted lookups for sensitive asset serial numbers.

ALTER TABLE fleet_units 
ADD COLUMN numero_serie_hash VARCHAR(64) AFTER numero_serie;

-- Create Unique Index to maintain registration integrity
CREATE UNIQUE INDEX idx_fleet_units_serie_hash ON fleet_units(numero_serie_hash);

-- Logic: New registrations will populate this via ALE (Application-Level Encryption)
