import { describe, it, expect, vi } from 'vitest';
import { deriveOwnerHandle } from '../utils/ownerHandle';
import { universeHandlePrefix, UNIVERSE_HANDLE_PREFIX_MAX } from './cosmology.service';

vi.mock('./db', () => ({ default: {} }));

/**
 * FC204 F1b (R 491_AN) — prefijo del handle de un Universo nuevo: su código de tipo, o `UNV` si no
 * cabe. `{PREFIX}-{6}` más el sufijo de colisión `-{3}` debe caber en `tenants.handle` VARCHAR(20).
 */
describe('universeHandlePrefix (FC204 F1b)', () => {
  it('usa el código de tipo cuando cabe', () => {
    expect(universeHandlePrefix('FMS')).toBe('FMS');
    expect(universeHandlePrefix('ABCDEFGHI')).toBe('ABCDEFGHI');
  });

  it('cae a UNV cuando el código pasa de 9 caracteres', () => {
    expect(universeHandlePrefix('ABCDEFGHIJ')).toBe('UNV');
  });

  it('el peor caso (prefijo máximo + base + sufijo de colisión) cabe en VARCHAR(20)', () => {
    const prefix = universeHandlePrefix('X'.repeat(UNIVERSE_HANDLE_PREFIX_MAX));
    const worst = `${deriveOwnerHandle(prefix, null, 'Universo Largo')}-ABC`;
    expect(worst.length).toBeLessThanOrEqual(20);
  });
});
