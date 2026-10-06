import { describe, it, expect, vi } from 'vitest';
import { personalScope } from './authUserManagement.service';

vi.mock('./db', () => ({ default: {} }));

/**
 * FC204 F4 (R 485_AN, lectura 3) — Personal se acota al Universo activo de la sesión (`tenant_id`),
 * para cualquier actor, Ω incluido. Sin Universo activo → `[]` (lista vacía).
 */
describe('personalScope (FC204 F4)', () => {
  it('un Universo activo positivo → solo ese Universo, aunque el actor sea Ω', () => {
    expect(personalScope({ id: 1, tenant_id: 41, permissions: ['*'] })).toEqual([41]);
    expect(personalScope({ id: 5, tenant_id: 7, permissions: ['fleet:scoped'] })).toEqual([7]);
  });

  it.each([undefined, null, 0, -3])(
    'tenant_id %s → [] (sin Universo activo, nunca la base entera)',
    (tenantId) => {
      expect(personalScope({ id: 1, tenant_id: tenantId, permissions: ['*'] })).toEqual([]);
    }
  );
});
