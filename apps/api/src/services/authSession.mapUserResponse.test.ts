import { describe, it, expect } from 'vitest';
import { RowDataPacket } from 'mysql2';
import EncryptionService from './encryption';
import { mapUserResponse } from './authSession.service';

/**
 * FC189 — incidente P0: `mapUserResponse` (compartida por /login, /refresh y /switch-tenant)
 * descifraba `user.email` SIN guardia. `EncryptionService.decrypt` hace `.split(':')` ANTES de su
 * propio try/catch, así que una cuenta con `email IS NULL` (caso real: la cuenta de Ω) tronaba con
 * `TypeError` no capturado, que `handleLogin` convertía en un 500 genérico — bloqueo total de sesión.
 * Este archivo usa el `EncryptionService` REAL (sin mockear) para reproducir el crash original y
 * confirmar el fix; los tests de `authSession.service.test.ts` mockean `decrypt` de forma
 * falsy-safe y por eso no lo habrían detectado.
 */

function row(overrides: Record<string, unknown>): RowDataPacket {
  return {
    id: 1,
    uuid: 'u-1',
    username: 'grayman',
    full_name: 'GrayMan',
    email: null,
    role_id: 0,
    role_name: 'GrayMan',
    department_name: null,
    profile_picture_url: null,
    employee_number: null,
    is_active: 1,
    ...overrides,
  } as RowDataPacket;
}

describe('FC189 — mapUserResponse: email NULL ya no truena', () => {
  it('email NULL ⇒ devuelve "" en vez de lanzar (reproduce el 500 original)', () => {
    expect(() => mapUserResponse(row({ email: null }))).not.toThrow();
    expect(mapUserResponse(row({ email: null })).email).toBe('');
  });

  it('email undefined (columna ausente en el SELECT) ⇒ también devuelve ""', () => {
    const withoutEmail = row({});
    delete (withoutEmail as { email?: unknown }).email;
    expect(mapUserResponse(withoutEmail).email).toBe('');
  });

  it('email cifrado presente ⇒ se sigue descifrando igual que siempre (0 regresión)', () => {
    const encrypted = EncryptionService.encrypt('grayman@piic.com.mx');
    expect(mapUserResponse(row({ email: encrypted })).email).toBe('grayman@piic.com.mx');
  });
});
