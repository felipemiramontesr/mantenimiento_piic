/* eslint-disable no-console */
/**
 * FC212 F1 — métrica previa al despliegue (Regla vinculante de F1, R 595_AN).
 *
 * Desde FC212, un identificador con `@` se busca SOLO por correo. Una cuenta activa cuyo nombre de
 * usuario contiene `@` pero cuyo correo registrado es nulo o distinto ya no podría entrar tecleando
 * ese usuario. Este script las cuenta. El correo está cifrado (AES-256-GCM), así que no es un WHERE:
 * se descifra en memoria y se compara.
 *
 * Salida: SOLO números. Nunca imprime usuarios, correos ni ids. 0 escritura.
 * Charlie lo corre en local; GrayMan (Ω) lo corre contra producción con su propio `.env`
 * (DB_* y DB_ENCRYPTION_KEY). Si `en riesgo` > 0, F1 no se despliega sin orden de Ω.
 *
 * Uso: bun scripts/auditUsernameEmailAtMismatch.ts
 */

export interface AccountRow {
  readonly username: string;
  readonly email: string | null;
}

export interface AtMismatchCount {
  /** Cuentas activas revisadas. */
  readonly active: number;
  /** De ellas, con `@` en el nombre de usuario. */
  readonly withAt: number;
  /** De ellas, con correo nulo, ilegible o distinto del nombre de usuario: quedarían fuera. */
  readonly atRisk: number;
}

/** ¿El correo registrado coincide con el nombre de usuario? Un cifrado ilegible cuenta como no. */
function emailMatches(row: AccountRow, decrypt: (cipher: string) => string): boolean {
  if (row.email === null) return false;
  try {
    return decrypt(row.email) === row.username;
  } catch {
    return false;
  }
}

/** Núcleo testeable: cuenta sobre filas de cuentas ACTIVAS. */
export function countAtMismatch(
  rows: readonly AccountRow[],
  decrypt: (cipher: string) => string
): AtMismatchCount {
  const withAt = rows.filter((row) => row.username.includes('@'));
  const atRisk = withAt.filter((row) => !emailMatches(row, decrypt)).length;
  return { active: rows.length, withAt: withAt.length, atRisk };
}

/** Las tres cifras, una por línea, sin ningún dato de las cuentas. */
export function formatCount(count: AtMismatchCount): string {
  return [
    `Cuentas activas: ${count.active}`,
    `Con @ en el usuario: ${count.withAt}`,
    `En riesgo (correo nulo o distinto): ${count.atRisk}`,
    count.atRisk === 0
      ? 'OK — ninguna cuenta quedaría fuera. F1 se puede desplegar.'
      : 'ALTO — F1 NO se despliega sin orden de GrayMan (FC212, regla vinculante de F1).',
  ].join('\n');
}

async function main(): Promise<void> {
  const { default: db } = await import('../apps/api/src/services/db');
  const { default: EncryptionService } = await import('../apps/api/src/services/encryption');
  try {
    const [rows] = await db.execute('SELECT username, email FROM users WHERE is_active = 1');
    const count = countAtMismatch(rows as AccountRow[], (cipher) =>
      EncryptionService.decrypt(cipher)
    );
    console.log(formatCount(count));
  } finally {
    await db.end();
  }
}

if (import.meta.main) {
  main().catch((err: unknown) => {
    console.error('[ERROR] auditUsernameEmailAtMismatch:', (err as Error).message);
    process.exitCode = 1;
  });
}
