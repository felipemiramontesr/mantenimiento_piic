/**
 * FC204 F1 (Invariante 1) — fail-closed for ids minted by an INSERT: anything but a positive integer
 * (the insertId 0 of B3-DEF2, when `common_catalogs.id` had no AUTO_INCREMENT) throws `<code>: …`, so
 * the caller's transaction rolls back before the id is used anywhere else.
 */
export default function requirePositiveInsertId(insertId: unknown, code: string): number {
  if (typeof insertId !== 'number' || !Number.isInteger(insertId) || insertId <= 0) {
    throw new Error(`${code}: insertId ${String(insertId)}`);
  }
  return insertId;
}
