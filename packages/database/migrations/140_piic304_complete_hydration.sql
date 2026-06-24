SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 140 — FC-7 FaseB: PIIC-304/305 Complete Hydration
-- Universos: VIM (technical/operational) + ERP (business/compliance/financial)
-- Idempotente: ALTER TABLE IF NOT EXISTS · INSERT IGNORE · UUID constantes
-- Orden crítico: ownerId UPDATE antes de financial_transactions
--   (view_fleet_units_tco usa INNER JOIN owners — ownerId=NULL excluye la unidad)
-- =============================================================================

-- ─── 1. ALTER TABLE — acquisitionCost ────────────────────────────────────────
ALTER TABLE fleet_units
  ADD COLUMN IF NOT EXISTS acquisitionCost DECIMAL(15,2) NULL
  AFTER insuranceCost;

-- ─── 2. VIM: Tipo de terreno (All-Terrain A/T — id=269 migration 028) ────────
UPDATE fleet_units
SET terrainTypeId = 269
WHERE id IN ('PIIC-304','PIIC-305')
  AND (terrainTypeId IS NULL OR terrainTypeId = 0);

-- ─── 3. ERP+VIM: Valor de adquisición (Toyota Hilux 2020 ≈ $650,000 MXN) ────
UPDATE fleet_units
SET acquisitionCost = 650000.00
WHERE id IN ('PIIC-304','PIIC-305')
  AND (acquisitionCost IS NULL OR acquisitionCost = 0);

-- ─── 4. ERP: ownerId PRIMERO (desbloquea INNER JOIN de view_fleet_units_tco) ─
UPDATE fleet_units SET
  ownerId             = (SELECT id FROM owners ORDER BY id LIMIT 1),
  complianceStatusId  = (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' ORDER BY id LIMIT 1),
  locationId          = (SELECT id FROM common_catalogs WHERE category = 'LOCATION' ORDER BY id LIMIT 1),
  maintenanceCenterId = (SELECT id FROM common_catalogs WHERE category = 'MAINTENANCE_CENTER' ORDER BY id LIMIT 1),
  insuranceCompanyId  = (SELECT id FROM common_catalogs WHERE category = 'INSURANCE_COMPANY' ORDER BY id LIMIT 1),
  insurancePolicyNumber = 'GNP-PIIC304-2026-MX',
  insuranceExpiryDate   = '2027-06-30'
WHERE id IN ('PIIC-304','PIIC-305');

-- ─── 5. VIM: Operator Scorecard — driver_id=304 (valor inválido en seed) → usuario real
UPDATE fleet_route_extensions fre
JOIN fleet_movements fm ON fre.movement_id = fm.id
SET fre.driver_id = (SELECT id FROM users ORDER BY id LIMIT 1)
WHERE fm.unit_id = 'PIIC-304'
  AND fm.movement_type = 'ROUTE'
  AND fre.driver_id = 304;

-- ─── 6. VIM: MAINTENANCE movement 1 (enero 2026 — 6h MTTR) ──────────────────
INSERT IGNORE INTO fleet_movements
  (uuid, unit_id, movement_type, status, start_reading, end_reading,
   fuel_level_start, start_at, end_at, description)
VALUES
  ('fc07-maint-0001-0000-000000000001','PIIC-304','MAINTENANCE','COMPLETED',
   35000.00, 35000.00, 80.00,
   '2026-01-10 08:00:00', '2026-01-10 14:00:00',
   'Mantenimiento correctivo — frenos y suspensión');

INSERT IGNORE INTO fleet_maintenance_extensions
  (movement_id, service_date, service_type, service_mode, cost, technician)
SELECT id, '2026-01-10', 'BASIC_10K', 'WORKSHOP', 3200.00, 'Ing. R. Torres'
FROM fleet_movements
WHERE uuid = 'fc07-maint-0001-0000-000000000001';

-- ─── 7. VIM: MAINTENANCE movement 2 (abril 2026 — 6.5h MTTR) ────────────────
INSERT IGNORE INTO fleet_movements
  (uuid, unit_id, movement_type, status, start_reading, end_reading,
   fuel_level_start, start_at, end_at, description)
VALUES
  ('fc07-maint-0002-0000-000000000002','PIIC-304','MAINTENANCE','COMPLETED',
   42500.00, 42500.00, 75.00,
   '2026-04-15 09:00:00', '2026-04-15 15:30:00',
   'Servicio 10,000 km — cambio aceite y filtros');

INSERT IGNORE INTO fleet_maintenance_extensions
  (movement_id, service_date, service_type, service_mode, cost, technician)
SELECT id, '2026-04-15', 'BASIC_10K', 'FULL_COMPLIANCE', 2800.00, 'Ing. R. Torres'
FROM fleet_movements
WHERE uuid = 'fc07-maint-0002-0000-000000000002';

-- ─── 8. VIM: 4 rutas anómalas (75L vs media 30L → z-score ≥ 3σ) ─────────────
-- Escenario: terreno accidentado + carga máxima + temperatura extrema junio 2026
INSERT IGNORE INTO fleet_movements
  (uuid, unit_id, movement_type, status, start_reading, end_reading,
   fuel_liters_loaded, fuel_amount, start_at, end_at, description)
VALUES
  ('fc07-anom-0001-0000-000000000001','PIIC-304','ROUTE','COMPLETED',45000,45250,75.00,1687.50,'2026-06-02 06:00:00','2026-06-02 16:00:00','SEED_ANOMALY'),
  ('fc07-anom-0002-0000-000000000002','PIIC-304','ROUTE','COMPLETED',45250,45500,78.00,1755.00,'2026-06-09 06:00:00','2026-06-09 16:00:00','SEED_ANOMALY'),
  ('fc07-anom-0003-0000-000000000003','PIIC-304','ROUTE','COMPLETED',45500,45750,72.00,1620.00,'2026-06-16 06:00:00','2026-06-16 16:00:00','SEED_ANOMALY'),
  ('fc07-anom-0004-0000-000000000004','PIIC-304','ROUTE','COMPLETED',45750,46000,76.00,1710.00,'2026-06-23 06:00:00','2026-06-23 16:00:00','SEED_ANOMALY');

INSERT IGNORE INTO fleet_route_extensions (movement_id, driver_id, destination)
SELECT fm.id, (SELECT id FROM users ORDER BY id LIMIT 1), 'Zona de Extracción Norte'
FROM fleet_movements fm
WHERE fm.uuid IN (
  'fc07-anom-0001-0000-000000000001',
  'fc07-anom-0002-0000-000000000002',
  'fc07-anom-0003-0000-000000000003',
  'fc07-anom-0004-0000-000000000004'
);

-- ─── 9. ERP: 13 financial_transactions 2026 ──────────────────────────────────
-- ownerId ya seteado → view_fleet_units_tco incluye PIIC-304 via INNER JOIN
-- Combustible: 6 registros mensuales (rutas base 30L + anómalas junio)
-- Mantenimiento: 5 registros (incluye 2 correctivos del seed de movimientos)
-- Seguro: 2 registros (prima semestral GNP)
INSERT IGNORE INTO financial_transactions
  (uuid, unit_id, category, amount, period, source, vendor, created_by)
VALUES
  ('fc07-fuel-0001-0000-000000000001','PIIC-304','FUEL',3375.00,'2026-01','MANUAL','PEMEX Est. 3201',(SELECT id FROM users ORDER BY id LIMIT 1)),
  ('fc07-fuel-0002-0000-000000000002','PIIC-304','FUEL',3375.00,'2026-02','MANUAL','PEMEX Est. 3201',(SELECT id FROM users ORDER BY id LIMIT 1)),
  ('fc07-fuel-0003-0000-000000000003','PIIC-304','FUEL',3375.00,'2026-03','MANUAL','PEMEX Est. 3201',(SELECT id FROM users ORDER BY id LIMIT 1)),
  ('fc07-fuel-0004-0000-000000000004','PIIC-304','FUEL',3375.00,'2026-04','MANUAL','PEMEX Est. 3201',(SELECT id FROM users ORDER BY id LIMIT 1)),
  ('fc07-fuel-0005-0000-000000000005','PIIC-304','FUEL',3375.00,'2026-05','MANUAL','PEMEX Est. 3201',(SELECT id FROM users ORDER BY id LIMIT 1)),
  ('fc07-fuel-0006-0000-000000000006','PIIC-304','FUEL',5062.50,'2026-06','MANUAL','PEMEX Est. 3201',(SELECT id FROM users ORDER BY id LIMIT 1)),
  ('fc07-mnt-00001-0000-000000000001','PIIC-304','MAINTENANCE',3200.00,'2026-01','MANUAL','Taller Central PIIC',(SELECT id FROM users ORDER BY id LIMIT 1)),
  ('fc07-mnt-00002-0000-000000000002','PIIC-304','MAINTENANCE',2800.00,'2026-04','MANUAL','Taller Central PIIC',(SELECT id FROM users ORDER BY id LIMIT 1)),
  ('fc07-mnt-00003-0000-000000000003','PIIC-304','MAINTENANCE',850.00,'2026-02','MANUAL','Taller Central PIIC',(SELECT id FROM users ORDER BY id LIMIT 1)),
  ('fc07-mnt-00004-0000-000000000004','PIIC-304','MAINTENANCE',1200.00,'2026-03','MANUAL','Taller Central PIIC',(SELECT id FROM users ORDER BY id LIMIT 1)),
  ('fc07-mnt-00005-0000-000000000005','PIIC-304','MAINTENANCE',650.00,'2026-05','MANUAL','Taller Central PIIC',(SELECT id FROM users ORDER BY id LIMIT 1)),
  ('fc07-ins-00001-0000-000000000001','PIIC-304','INSURANCE',4800.00,'2026-01','MANUAL','GNP Seguros',(SELECT id FROM users ORDER BY id LIMIT 1)),
  ('fc07-ins-00002-0000-000000000002','PIIC-304','INSURANCE',4800.00,'2026-04','MANUAL','GNP Seguros',(SELECT id FROM users ORDER BY id LIMIT 1));
