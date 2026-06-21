SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 127 — VIM Perfect Universe: Extend financial_transactions category ENUM
-- Adds TENENCIA and VERIFICACION to support VIM private owner expenses (Mexico).
-- MODIFY COLUMN requires the FULL ENUM list (existing + new values).
-- Existing values from migration_085: LEASE, INSURANCE, MAINTENANCE, FUEL, TIRE, FINE, REPAIR, OTHER
-- =============================================================================

ALTER TABLE financial_transactions
  MODIFY COLUMN category ENUM(
    'LEASE',
    'INSURANCE',
    'MAINTENANCE',
    'FUEL',
    'TIRE',
    'FINE',
    'REPAIR',
    'TENENCIA',
    'VERIFICACION',
    'OTHER'
  ) NOT NULL;
