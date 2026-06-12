-- =============================================================================
-- Migration: 099 — Drop Duplicate Financial Index (corrige 098)
-- Context : financial_transactions YA contaba con idx_unit_period (unit_id, period)
--           desde su esquema original. La 098 creó un duplicado exacto
--           (idx_ft_unit_period) — detectado por Note #1831 en prod. El índice
--           original cubre íntegramente las queries del contrato
--           Alerts_Finance_Domain; el duplicado solo añade costo de escritura.
--           Idempotente vía information_schema.
-- =============================================================================

SET @dup_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'financial_transactions'
    AND index_name = 'idx_ft_unit_period'
);

SET @ddl := IF(
  @dup_exists > 0,
  'DROP INDEX idx_ft_unit_period ON financial_transactions',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
