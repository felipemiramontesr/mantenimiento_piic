-- ============================================================
-- Migration 118: Archon Master — Suite Column en owners
-- Context: Multiverso Archon — suite explícita por universo.
--          FLOTILLA → ERP · CENTER/PRIVATE → VIM
--          CHECK constraint impide combinaciones inválidas.
-- Idempotent: ADD COLUMN IF NOT EXISTS — seguro de repetir.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE owners
  ADD COLUMN IF NOT EXISTS suite ENUM('VIM','ERP') NOT NULL DEFAULT 'ERP' AFTER owner_type;

-- ─── Poblar suite desde owner_type existente (backfill) ──────
UPDATE owners SET suite = 'ERP' WHERE owner_type = 'FLOTILLA';
UPDATE owners SET suite = 'VIM' WHERE owner_type IN ('CENTER', 'PRIVATE');

-- ─── CHECK constraint (integridad suite ↔ owner_type) ────────
-- MySQL 8.0.16+ soporta CHECK constraints con enforcement.
-- Si el servidor es anterior, el ALTER se aplica sin error pero sin enforcement.
ALTER TABLE owners
  ADD CONSTRAINT IF NOT EXISTS chk_owner_suite CHECK (
    (owner_type = 'FLOTILLA' AND suite = 'ERP') OR
    (owner_type IN ('PRIVATE', 'CENTER') AND suite = 'VIM')
  );

SET FOREIGN_KEY_CHECKS = 1;

-- ─── Verificación post-migración ─────────────────────────────
-- DESCRIBE owners;
-- SELECT owner_type, suite, COUNT(*) FROM owners GROUP BY owner_type, suite;
