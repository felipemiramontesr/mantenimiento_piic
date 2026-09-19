import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import EncryptionService from './encryption';
import { findPendingUsers } from './universeUserLinking.repository';
import { listPendingUsers } from './cosmology.service';

/**
 * FC189 — mismo guard aplicado a `listPendingUsers` (GET /cosmology/pending-users):
 * `EncryptionService.decrypt(r.email)` sin protección tronaba con `email IS NULL`. Usa el
 * `EncryptionService` REAL (sin mockear) para no enmascarar el bug.
 */

vi.mock('./universeUserLinking.repository', () => ({ findPendingUsers: vi.fn() }));

function pendingRow(email: unknown): Record<string, unknown> {
  return {
    id: 501,
    username: 'cliente.pendiente',
    full_name: 'Juan Pérez',
    rfc: 'ABC010101AB9',
    razon_social: 'Cliente Ejemplo SA de CV',
    email,
  };
}

describe('FC189 — listPendingUsers: email NULL ya no truena', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('email NULL ⇒ fila con email "" en vez de 500', async () => {
    (findPendingUsers as Mock).mockResolvedValue({ rows: [pendingRow(null)], total: 1 });

    const result = await listPendingUsers();

    expect(result.data[0].email).toBe('');
  });

  it('email cifrado presente ⇒ se descifra igual que siempre (0 regresión)', async () => {
    const encrypted = EncryptionService.encrypt('juan@example.com');
    (findPendingUsers as Mock).mockResolvedValue({ rows: [pendingRow(encrypted)], total: 1 });

    const result = await listPendingUsers();

    expect(result.data[0].email).toBe('juan@example.com');
  });
});
