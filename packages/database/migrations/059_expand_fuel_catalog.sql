-- 🔱 ARCHON CATALOG EXPANSION v.1.0
-- Logic: Adding Gas as a valid fuel type for industrial units.
-- Purpose: 100% Operational Coverage.
-- Architecture: Sovereing Data Infrastructure (v.41.7.0)

INSERT INTO common_catalogs (category, code, label, created_at)
SELECT 'FUEL_TYPE', 'FT_GAS', 'Gas LP/Natural', NOW()
FROM (SELECT 1) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM common_catalogs WHERE code = 'FT_GAS');
