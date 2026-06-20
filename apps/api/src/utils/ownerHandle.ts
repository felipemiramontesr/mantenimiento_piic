import { RowDataPacket } from 'mysql2';

const HANDLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomSuffix(): string {
  return Array.from(
    { length: 3 },
    () => HANDLE_CHARS[Math.floor(Math.random() * HANDLE_CHARS.length)]
  ).join('');
}

/**
 * Derives a deterministic handle base: {SUITE}-{6CHARS}
 * Priority: RFC ≥6 chars → RFC padded → username → throw (§14 impossible)
 */
export function deriveOwnerHandle(
  suite: string,
  rfc: string | null | undefined,
  username: string
): string {
  const prefix = suite.toUpperCase();
  const cleanRfc = rfc ? rfc.replace(/[^A-Z0-9]/gi, '').toUpperCase() : '';

  let base: string;
  if (cleanRfc.length >= 6) {
    base = cleanRfc.slice(0, 6);
  } else if (cleanRfc.length > 0) {
    base = cleanRfc.padEnd(6, '0');
  } else {
    base = username
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
      .padEnd(6, '0')
      .slice(0, 6);
  }

  return `${prefix}-${base}`;
}

type DbConn = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute<T extends RowDataPacket[]>(sql: string, values?: any): Promise<[T, unknown]>;
};

/**
 * Resolves a system-unique handle for a new owner.
 * On collision (extremely rare) appends a 3-char random suffix.
 * Throws if two attempts both collide.
 */
export async function resolveUniqueHandle(
  connection: DbConn,
  suite: string,
  rfc: string | null | undefined,
  username: string
): Promise<string> {
  const base = deriveOwnerHandle(suite, rfc, username);

  const [existing] = await connection.execute<RowDataPacket[]>(
    'SELECT id FROM owners WHERE handle = ? LIMIT 1',
    [base]
  );
  if (existing.length === 0) return base;

  const candidate = `${base}-${randomSuffix()}`;
  const [exists] = await connection.execute<RowDataPacket[]>(
    'SELECT id FROM owners WHERE handle = ? LIMIT 1',
    [candidate]
  );
  if (exists.length === 0) return candidate;

  throw new Error(`HANDLE_COLLISION: cannot generate unique handle for ${base}`);
}
