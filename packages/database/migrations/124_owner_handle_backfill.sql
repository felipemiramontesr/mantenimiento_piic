-- ══════════════════════════════════════════════════════════
-- Migration 124 — OwnerHandle Backfill (FC-1 Subfase 1C)
-- Genera handles para todos los owners existentes sin handle.
-- Prioridad: RFC ≥6 chars → username → error (§14 imposible)
-- Después del backfill: handle NOT NULL enforced.
-- Idempotente: UPDATEs usan WHERE handle IS NULL (no-op si ya backfilled)
-- ══════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- Nivel 1: RFC completo o suficientemente largo (≥6 chars)
UPDATE owners o
  JOIN owner_profiles op ON op.owner_id = o.id
SET o.handle = CONCAT(o.suite, '-', UPPER(LEFT(op.rfc, 6)))
WHERE o.handle IS NULL
  AND op.rfc IS NOT NULL
  AND LENGTH(TRIM(op.rfc)) >= 6;

-- Nivel 2: sin RFC o RFC corto → derivar de username
UPDATE owners o
  JOIN user_owner_membership uom ON uom.owner_id = o.id
  JOIN users u ON u.id = uom.user_id
SET o.handle = CONCAT(o.suite, '-', UPPER(LEFT(u.username, 6)))
WHERE o.handle IS NULL;

-- Verificación: ningún owner debe quedar sin handle
-- (si retorna filas, hay un owner sin user — violación §14)
SELECT id, owner_type, suite, label, handle
FROM owners
WHERE handle IS NULL;

-- Enforcar NOT NULL una vez backfill completado
ALTER TABLE owners
  MODIFY COLUMN handle VARCHAR(20) NOT NULL
    COMMENT 'Identificador estable RFC-derivado. Formato: {SUITE}-{6CHARS}. Inmutable tras primer asignación.';
