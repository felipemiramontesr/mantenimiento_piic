/**
 * FC169 — Password_Reset_CLI_Utility (OLR 3/3: O Alfa · R Bravo 289_AN · L GrayMan "sc").
 *
 * Restablece `users.password_hash` de UN usuario existente, identificado por `username`,
 * en la base de datos a la que apunte el `.env` del entorno donde se ejecute.
 *
 * Ubicación: `apps/api/src/scripts/` (NO el `scripts/` raíz que asumía el FC) — es el único
 * lugar donde `@node-rs/argon2` y `mysql2/promise` resuelven, requisito de Cond.R-169 R1
 * (mismo hasher que el alta de usuario). Misma carpeta que `seeding/`. El comportamiento,
 * la firma y las condiciones del FC no cambian, solo la ruta.
 *
 * Uso:   bun apps/api/src/scripts/resetUserPassword.ts --username <u>
 *        (la nueva contraseña se lee de la env `RESET_NEW_PASSWORD` o, si no está,
 *         de un prompt stdin con eco silenciado — NUNCA de argv)
 *
 * Cond.R-169:
 *   R1  hash con la misma API `argon2Hash(password)` sin opciones que el único punto de
 *       hashing del sistema (`apps/api/src/services/authUserManagement.service.ts`).
 *   R2  password nunca en argv ni en ningún log; username confirmado 2×; 0 print de hash.
 *   R3  `UPDATE users SET password_hash = ? WHERE username = ?` transaccional; 0 otras columnas.
 *   R4  Charlie ejecuta SOLO en local; el reset de producción lo corre GrayMan (Ω) con su
 *       propio `.env` de prod. 0 credenciales de prod en H/chat.
 *   R5  0 endpoint HTTP. No se documenta como backdoor en ningún README público.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { hash as argon2Hash } from '@node-rs/argon2';

type UserRow = { id: number; username: string; is_active: number };

export interface ResetableConnection {
  execute(sql: string, values: unknown[]): Promise<[UserRow[], unknown]>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/** Núcleo testeable: valida ∃! usuario por username y aplica el UPDATE transaccional.
 * `newPassword` llega ya como string en claro (main() lo obtuvo de stdin/env, nunca de
 * argv). No imprime ni el hash ni la contraseña. */
export async function resetUserPassword(
  conn: ResetableConnection,
  username: string,
  newPassword: string
): Promise<{ id: number; isActive: number }> {
  const [rows] = await conn.execute(
    'SELECT id, username, is_active FROM users WHERE username = ?',
    [username]
  );
  if (rows.length === 0) {
    throw new Error(`Usuario no encontrado: "${username}"`);
  }
  if (rows.length > 1) {
    throw new Error(`Ambigüedad: ${rows.length} usuarios con username "${username}" — abortado`);
  }

  const passwordHash = await argon2Hash(newPassword);

  await conn.beginTransaction();
  try {
    await conn.execute('UPDATE users SET password_hash = ? WHERE username = ?', [
      passwordHash,
      username,
    ]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  }

  return { id: Number(rows[0].id), isActive: Number(rows[0].is_active) };
}

/** Lee una línea de stdin con un prompt. Devuelve el texto sin el salto de línea. */
function askLine(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** Nueva contraseña: prioriza `RESET_NEW_PASSWORD`; si no, prompt stdin SIN eco (readline sin
 * stream de `output` no imprime lo tecleado). Nunca la imprime ni la devuelve por otro canal. */
function askHiddenPassword(prompt: string): Promise<string> {
  const fromEnv = process.env.RESET_NEW_PASSWORD;
  if (fromEnv && fromEnv.length > 0) return Promise.resolve(fromEnv);

  process.stdout.write(prompt);
  const rl = readline.createInterface({ input: process.stdin });
  return new Promise((resolve) => {
    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

/** Parsea `--username <u>` o el primer argumento posicional. */
function parseUsernameArg(argv: string[]): string | null {
  const flagIdx = argv.indexOf('--username');
  if (flagIdx !== -1 && argv[flagIdx + 1]) return argv[flagIdx + 1].trim();
  const positional = argv.find((a) => !a.startsWith('-'));
  return positional ? positional.trim() : null;
}

/** Import dinámico de `dotenv` + `mysql2/promise` — así el módulo se importa en tests sin
 * resolver el driver ni cargar ningún `.env`. */
async function openConnection(): Promise<ResetableConnection & { end(): Promise<void> }> {
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
  return raw as unknown as ResetableConnection & { end(): Promise<void> };
}

async function main(): Promise<void> {
  const username = parseUsernameArg(process.argv.slice(2));
  if (!username) {
    console.error('Falta --username <u>. Uso: bun .../resetUserPassword.ts --username <u>');
    process.exit(2);
  }

  const confirm = await askLine(`Confirma el username a resetear ("${username}"): `);
  if (confirm !== username) {
    console.error(`Confirmación no coincide ("${confirm}" ≠ "${username}") — abortado.`);
    process.exit(3);
  }

  const newPassword = await askHiddenPassword('Nueva contraseña (oculta): ');
  if (!newPassword || newPassword.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres — abortado.');
    process.exit(4);
  }

  const conn = await openConnection();
  try {
    const { id, isActive } = await resetUserPassword(conn, username, newPassword);
    console.log(
      `OK — contraseña actualizada · username=${username} · id=${id} · is_active=${isActive}`
    );
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`);
    process.exit(1);
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
