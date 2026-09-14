/**
 * FC177 F1 — Login_Hard_Gate_And_Billing_Schema (Cond.R-177, Bravo 312_AN).
 *
 * Censo de solo lectura de `users.is_active` — se corre ANTES de que el gate duro en
 * `authSession.service.ts` (`login()`) llegue a producción, para confirmar que no hay
 * cuentas reales `is_active=0` preexistentes (por razones ajenas a FC177) que el nuevo
 * bloqueo tumbaría sin querer. Charlie solo ejecuta contra la DB local (Regla de esta
 * sesión, mismo precedente que FC169's `resetUserPassword.ts`); GrayMan corre esto
 * contra producción con su propio `.env` antes de aprobar el despliegue de F1.
 *
 * Uso: bun apps/api/src/scripts/auditIsActiveUsers.ts
 * 0 escritura. 0 argumentos. 0 credenciales impresas.
 */
import path from 'path';
import { fileURLToPath } from 'url';

interface UserRow {
  id: number;
  username: string;
  role_id: number;
  is_active: number;
}

export interface AuditableConnection {
  execute(sql: string): Promise<[UserRow[], unknown]>;
}

/** Núcleo testeable: agrupa usuarios por `is_active` y lista los bloqueados. */
export async function auditIsActiveUsers(
  conn: AuditableConnection
): Promise<{ total: number; active: number; inactive: UserRow[] }> {
  const [rows] = await conn.execute('SELECT id, username, role_id, is_active FROM users');
  const inactive = rows.filter((r) => !r.is_active);
  return { total: rows.length, active: rows.length - inactive.length, inactive };
}

async function openConnection(): Promise<AuditableConnection & { end(): Promise<void> }> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(currentDir, '../../../../.env') });

  const { createConnection } = await import('mysql2/promise');
  const raw = await createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'archon',
    multipleStatements: false,
  });
  return raw as unknown as AuditableConnection & { end(): Promise<void> };
}

async function main(): Promise<void> {
  const conn = await openConnection();
  try {
    const { total, active, inactive } = await auditIsActiveUsers(conn);
    console.log(
      `Total usuarios: ${total} · is_active=1: ${active} · is_active=0: ${inactive.length}`
    );
    if (inactive.length > 0) {
      console.log('\nCuentas is_active=0 encontradas (revisar antes de desplegar el gate duro):');
      inactive.forEach((u) =>
        console.log(`  id=${u.id} username=${u.username} role_id=${u.role_id}`)
      );
    } else {
      console.log('\nOK — ninguna cuenta is_active=0 preexistente. Seguro desplegar el gate duro.');
    }
  } finally {
    await conn.end();
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
