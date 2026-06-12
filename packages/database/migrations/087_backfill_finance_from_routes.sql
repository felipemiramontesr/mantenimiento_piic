-- ============================================================
-- 087_backfill_finance_from_routes.sql
-- Backfill histórico: registra el costo de combustible/insumos
-- de rutas completadas en financial_transactions.
--
-- Idempotente: usa source_uuid para evitar duplicados.
-- Ejecutar SOLO después de validar los montos con el cliente.
-- ============================================================

INSERT INTO financial_transactions
  (uuid, unit_id, category, amount, period, source, source_uuid, notes, created_by, created_at)
SELECT
  UUID(),
  fm.unit_id,
  'FUEL',
  fm.fuel_amount,
  DATE_FORMAT(COALESCE(fm.end_at, fm.created_at), '%Y-%m'),
  'AUTO',
  fm.uuid,
  CONCAT('Backfill ruta — combustible + insumos: ', fm.uuid),
  (SELECT MIN(id) FROM users),
  COALESCE(fm.end_at, fm.created_at)
FROM fleet_movements fm
WHERE fm.movement_type = 'ROUTE'
  AND fm.status     = 'COMPLETED'
  AND fm.fuel_amount > 0
  AND NOT EXISTS (
    SELECT 1
    FROM financial_transactions ft_chk
    WHERE ft_chk.source    = 'AUTO'
      AND ft_chk.category  = 'FUEL'
      AND ft_chk.source_uuid IS NOT NULL
      AND CONVERT(ft_chk.source_uuid USING utf8mb4) = CONVERT(fm.uuid USING utf8mb4)
  );
