-- ============================================================
-- Migration 184: handle de los Universos con handle vacío — FC204 F1 (adenda F1b) · 2026-10-05
--   (Tenants_Handle_Uniqueness_And_Backfill)
-- Context: hallazgo de driver (H 13:43). `insertTenant` no enviaba `tenants.handle` (NOT NULL, UNIQUE
--          `idx_owners_handle`, migraciones 123/124); MariaDB sin modo estricto guardó '' y el segundo
--          Universo chocaba en el índice. La 183 restauró ese '' al renumerar (la cadena vacía no es
--          NULL). O 486/488/490_AN · R 487/489/491_AN · Ω aceptó la adenda 2026-10-05 16:59.
--
-- Backfill histórico SOLO de `handle = ''`, con `CONCAT('UNV-', id)` (≤ 15 caracteres en
-- VARCHAR(20); sin LPAD, que trunca a más de 6 dígitos). La acuñación viva NO usa este algoritmo:
-- usa `resolveUniqueHandle` (cosmology.service.ts). `handle IS NULL` no puede ocurrir desde la 124.
-- Aserción previa: si algún candidato ya existe como handle, la consulta falla, el cliente mysql se
-- detiene y la TX sin COMMIT se revierte. Solo DML: la huella de esquema (Regla 23) no cambia.
-- Idempotente: sin filas `handle = ''` no hace nada. Orden: PRIMERO local, DESPUÉS prod.
-- ============================================================

SET NAMES utf8mb4;

START TRANSACTION;

SET @fc204b_collisions := (
  SELECT COUNT(*)
  FROM tenants empty_handle
  JOIN tenants taken ON taken.handle = CONCAT('UNV-', empty_handle.id)
  WHERE empty_handle.handle = ''
);

SET @fc204b_assert := IF(@fc204b_collisions = 0, 'DO 0', 'SELECT 1 FROM fc204b_assertion_failed_handle_candidate_exists');
PREPARE fc204b_stmt FROM @fc204b_assert;
EXECUTE fc204b_stmt;
DEALLOCATE PREPARE fc204b_stmt;

UPDATE tenants SET handle = CONCAT('UNV-', id) WHERE handle = '';

COMMIT;
