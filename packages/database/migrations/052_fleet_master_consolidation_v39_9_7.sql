-- 🔱 ARCHON MASTER CONSOLIDATION v.39.9.7
-- Purpose: Standardize column types, purify frequency IDs, and inject master lease metadata for all 23 units.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. ESTRUCTURA
ALTER TABLE fleet_units MODIFY COLUMN monthly_lease_payment DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE fleet_units MODIFY COLUMN capacidad_carga DECIMAL(10,2) DEFAULT 0.00;

-- 2. FRECUENCIAS
UPDATE fleet_units SET maintenance_usage_freq_id = 949 WHERE maint_interval_km = 10000 OR maintenance_usage_freq_id IN (1,2);
UPDATE fleet_units SET maintenance_usage_freq_id = 948 WHERE maint_interval_km = 5000;
UPDATE fleet_units SET maintenance_time_freq_id = 9 WHERE maint_interval_days = 180 OR maintenance_time_freq_id IN (1,2);
UPDATE fleet_units SET maintenance_time_freq_id = 7 WHERE maint_interval_days = 90;

-- 3. LEASING (Master Data Sync)
UPDATE fleet_units SET monthly_lease_payment = 14850.00 WHERE id IN ('ASM-002','ASM-008','ASM-011','ASM-012','ASM-013','ASM-014','ASM-017','ASM-019','ASM-020','ASM-021','ASM-024','ASM-026','ASM-027');
UPDATE fleet_units SET monthly_lease_payment = 13200.00 WHERE id IN ('ASM-006','ASM-007','ASM-025');
UPDATE fleet_units SET monthly_lease_payment = 9800.00 WHERE id IN ('ASM-009','ASM-010','ASM-015','ASM-016','ASM-018','ASM-022','ASM-023');

-- 4. IDENTITY
UPDATE fleet_units SET model_id = 905 WHERE id = 'ASM-011';

SET FOREIGN_KEY_CHECKS = 1;
