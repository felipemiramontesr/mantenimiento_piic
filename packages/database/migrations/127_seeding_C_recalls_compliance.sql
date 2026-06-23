-- ============================================================
-- SEEDING C — catalog_recalls + fleet_unit_recalls + compliance
-- FC: DataResilience_NHTSAIntegration · FaseC
-- DB: u701509674_Mant_piic (prod)
-- Idempotente: INSERT IGNORE en ambas tablas (unique keys).
-- ============================================================

-- ─── catalog_recalls — 6 campañas NHTSA ──────────────────────
INSERT IGNORE INTO catalog_recalls (campaign_code, description, make, model, year, published_date) VALUES
('DC-NP300-2021-A',
 'Defecto en asistencia de dirección hidráulica — posible pérdida de control en velocidades altas.',
 'NISSAN', 'NP300', 2021, '2024-03-15'),
('DC-NP300-2021-B',
 'Inflador de bolsa de aire defectuoso — riesgo de proyección de fragmentos metálicos.',
 'NISSAN', 'NP300', 2021, '2024-07-22'),
('DC-NP300-2021-C',
 'Contaminación de líquido de frenos — reducción de eficacia de frenado en condiciones húmedas.',
 'NISSAN', 'NP300', 2021, '2025-01-10'),
('DC-SILV-2019-A',
 'Sensor de cinturón de seguridad — puede no detectar ocupante correctamente, desactivando airbag.',
 'CHEVROLET', 'SILVERADO 1500', 2019, '2024-05-08'),
('DC-SILV-2019-B',
 'Módulo de airbag lateral — circuito defectuoso puede impedir despliegue en colisión lateral.',
 'CHEVROLET', 'SILVERADO 1500', 2019, '2023-11-30'),
('DC-NP300-2020-A',
 'Inyector de combustible — goteo interno puede causar exceso de consumo y arranque irregular.',
 'NISSAN', 'NP300', 2020, '2025-03-20');

-- ─── fleet_unit_recalls ───────────────────────────────────────
-- PIIC-101 EC-2: TRIPLE RECALL — 3 campañas PENDING simultáneas
INSERT IGNORE INTO fleet_unit_recalls (fleet_unit_id, recall_id, status, resolved_at)
SELECT 'PIIC-101', id, 'PENDING', NULL FROM catalog_recalls WHERE campaign_code = 'DC-NP300-2021-A';

INSERT IGNORE INTO fleet_unit_recalls (fleet_unit_id, recall_id, status, resolved_at)
SELECT 'PIIC-101', id, 'PENDING', NULL FROM catalog_recalls WHERE campaign_code = 'DC-NP300-2021-B';

INSERT IGNORE INTO fleet_unit_recalls (fleet_unit_id, recall_id, status, resolved_at)
SELECT 'PIIC-101', id, 'PENDING', NULL FROM catalog_recalls WHERE campaign_code = 'DC-NP300-2021-C';

-- PIIC-202 EC-1: PERFECT COMPLIANCE — 1 PENDING + 1 COMPLETED (ya atendido)
INSERT IGNORE INTO fleet_unit_recalls (fleet_unit_id, recall_id, status, resolved_at)
SELECT 'PIIC-202', id, 'PENDING', NULL FROM catalog_recalls WHERE campaign_code = 'DC-SILV-2019-A';

INSERT IGNORE INTO fleet_unit_recalls (fleet_unit_id, recall_id, status, resolved_at)
SELECT 'PIIC-202', id, 'COMPLETED', '2024-12-01' FROM catalog_recalls WHERE campaign_code = 'DC-SILV-2019-B';

-- PIIC-303 EC-1: RECALL + MAINTENANCE OVERLAP
INSERT IGNORE INTO fleet_unit_recalls (fleet_unit_id, recall_id, status, resolved_at)
SELECT 'PIIC-303', id, 'PENDING', NULL FROM catalog_recalls WHERE campaign_code = 'DC-NP300-2020-A';

-- ─── Compliance UPDATE — PIIC-202 EC-1 ───────────────────────
-- Outlier positivo: fechas de cumplimiento muy en el futuro
UPDATE fleet_units SET
  insuranceExpiryDate     = '2027-12-31',
  vencimientoVerificacion = '2027-06-30',
  insurancePolicyNumber   = 'QUA-2024-SIL-0482'
WHERE id = 'PIIC-202';

-- ─── Verificación ─────────────────────────────────────────────
SELECT
  fur.fleet_unit_id,
  cr.campaign_code,
  cr.make,
  cr.model,
  cr.year,
  fur.status,
  fur.resolved_at
FROM fleet_unit_recalls fur
JOIN catalog_recalls cr ON cr.id = fur.recall_id
WHERE cr.campaign_code LIKE 'DC-%'
ORDER BY fur.fleet_unit_id, cr.campaign_code;

SELECT
  id,
  insuranceExpiryDate,
  vencimientoVerificacion,
  insurance_policy_number
FROM fleet_units
WHERE id = 'PIIC-202';
