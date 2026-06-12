-- =============================================================================
-- Migration: 098 — Financial Alerts Composite Index
-- Context : Contrato Alerts_Finance_Domain — soporta NOT EXISTS (LEASE del period
--           actual) y la agregación por unidad/período de EXPENSE_ANOMALY sin
--           table scans. Idempotente vía information_schema (MySQL 8 no soporta
--           CREATE INDEX IF NOT EXISTS; MariaDB sí — este patrón cubre ambos).
-- =============================================================================

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'financial_transactions'
    AND index_name = 'idx_ft_unit_period'
);

SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_ft_unit_period ON financial_transactions (unit_id, period)',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
