-- ============================================================
-- SEEDING CLEANUP — elimina TODOS los datos de FaseA/B/C
-- FC: DataResilience_NHTSAIntegration
-- Ejecutar SOLO cuando se quiera revertir el seeding completo.
-- Orden inverso de FKs: unit_recalls → catalog → incidents
--   → financial_transactions → route_extensions → movements → units
-- ============================================================

-- ─── FaseC cleanup ────────────────────────────────────────────
DELETE fur FROM fleet_unit_recalls fur
JOIN catalog_recalls cr ON cr.id = fur.recall_id
WHERE cr.campaign_code LIKE 'DC-%';

DELETE FROM catalog_recalls WHERE campaign_code LIKE 'DC-%';

-- Revertir compliance PIIC-202 a valores por defecto
UPDATE fleet_units SET
  insuranceExpiryDate     = NULL,
  vencimientoVerificacion = NULL,
  insurance_policy_number = NULL
WHERE id = 'PIIC-202';

-- ─── FaseB cleanup ────────────────────────────────────────────
DELETE FROM route_incidents WHERE description LIKE '[SEED_B]%';
DELETE FROM financial_transactions WHERE notes = 'SEED_B';

-- ─── FaseA cleanup ────────────────────────────────────────────
DELETE frc FROM fleet_route_checkpoints frc
JOIN fleet_movements fm ON fm.id = frc.movement_id
WHERE fm.description = 'SEED_A';

DELETE fre FROM fleet_route_extensions fre
JOIN fleet_movements fm ON fm.id = fre.movement_id
WHERE fm.description = 'SEED_A';

DELETE FROM fleet_movements WHERE description = 'SEED_A';

DELETE FROM fleet_units WHERE id IN ('PIIC-304', 'PIIC-305');

-- ─── Verificación ─────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM fleet_movements   WHERE description = 'SEED_A')       AS seed_a_movements,
  (SELECT COUNT(*) FROM financial_transactions WHERE notes  = 'SEED_B')        AS seed_b_transactions,
  (SELECT COUNT(*) FROM route_incidents   WHERE description LIKE '[SEED_B]%')  AS seed_b_incidents,
  (SELECT COUNT(*) FROM catalog_recalls   WHERE campaign_code LIKE 'DC-%')     AS seed_c_recalls,
  (SELECT COUNT(*) FROM fleet_units       WHERE id IN ('PIIC-304','PIIC-305')) AS seed_a_units;
-- Todos deben ser 0 si cleanup fue exitoso.
