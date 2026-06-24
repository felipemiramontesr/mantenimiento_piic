-- ══════════════════════════════════════════════════════════
-- Migration 123 — OwnerHandle_RFC_Derivado (FC-1 Subfase 1B)
-- Agrega columna `handle` a `owners`: identificador estable,
-- legible, derivado de RFC, portátil entre universos.
-- Formato: {SUITE}-{RFC[0..5]} | {SUITE}-{USERNAME[0..5]}
-- Backfill en Subfase 1C (migration 124).
-- Idempotente: ADD COLUMN IF NOT EXISTS / INDEX IF NOT EXISTS
-- ══════════════════════════════════════════════════════════

SET NAMES utf8mb4;

ALTER TABLE owners
  ADD COLUMN IF NOT EXISTS handle VARCHAR(20) NULL
    COMMENT 'Identificador estable RFC-derivado. Formato: {SUITE}-{6CHARS}. Inmutable tras primer asignación.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_handle ON owners (handle);
