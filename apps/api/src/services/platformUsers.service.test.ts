import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import EncryptionService from './encryption';
import * as PlatformUsersRepository from './platformUsers.repository';
import { listPlatformUsers } from './platformUsers.service';

/**
 * FC205 F1 (PU-DEF1 · Escenario 1 · T1 filas 1–3) — el correo de la consola se descifra con el
 * `EncryptionService` REAL (llave de prueba de vitest.config): solo el repositorio va mockeado.
 */

vi.mock('./platformUsers.repository', () => ({
  listPlatformUsers: vi.fn(),
  findUserUniverses: vi.fn(),
}));

/** Una fila de la consola con el correo tal como lo guarda la base. */
function rowWithEmail(email: string | null): Record<string, unknown> {
  return {
    id: 20,
    username: 'arc.user',
    fullName: 'Arc User',
    email,
    isActive: 1,
    tenantId: 41,
    tenantName: 'Flota Norte',
    cosmonautType: 'ARC',
  };
}

/** El correo que la consola entrega para lo que hay guardado. */
async function emailFor(stored: string | null): Promise<string> {
  (PlatformUsersRepository.listPlatformUsers as Mock).mockResolvedValueOnce({
    rows: [rowWithEmail(stored)],
    total: 1,
  });
  const { data } = await listPlatformUsers({ scope: undefined, page: 1, pageSize: 25 });
  return data[0].email;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listPlatformUsers — correo descifrado (FC205 F1)', () => {
  it('T1 fila 1: un cifrado iv:tag:hex bien formado sale en claro', async () => {
    const stored = EncryptionService.encrypt('arc@piic.mx');
    expect(stored.split(':')).toHaveLength(3);
    expect(await emailFor(stored)).toBe('arc@piic.mx');
  });

  it.each([
    ['sin la forma iv:tag:hex', 'texto-plano-heredado'],
    ['con la forma pero sin descifrar (llave o datos rotos)', 'aa:bb:cc'],
  ])('T1 fila 2: formato roto (%s) devuelve el texto guardado', async (_label, stored) => {
    expect(await emailFor(stored)).toBe(stored);
  });

  it.each([null, ''])('T1 fila 3: correo %j → cadena vacía (fail-closed)', async (stored) => {
    expect(await emailFor(stored)).toBe('');
  });
});
