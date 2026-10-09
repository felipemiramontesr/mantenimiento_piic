import { describe, it, expect } from 'vitest';
import { displayNameFor, handleCandidates, HANDLE_PATTERN } from './arcsialHandle';

/** FC209 (R 540/542_AN) — reglas puras del @handle. */

describe('handleCandidates', () => {
  it('arc_ + hex del uuid sin guiones, de 8, 12, 16 y 26; todos caben en el patrón', () => {
    const candidates = handleCandidates('ABCDEF01-2345-4789-8abc-def012345678');
    expect(candidates).toEqual([
      'arc_abcdef01',
      'arc_abcdef012345',
      'arc_abcdef0123454789',
      'arc_abcdef01234547898abcdef012',
    ]);
    candidates.forEach((handle) => expect(HANDLE_PATTERN.test(handle)).toBe(true));
    expect(candidates[3]).toHaveLength(30);
  });
});

describe('displayNameFor', () => {
  it.each([
    ['  Ana Pérez  ', 'Ana Pérez'],
    ['', 'arc_1'],
    ['   ', 'arc_1'],
    [null, 'arc_1'],
    [undefined, 'arc_1'],
  ])('%j → %j', (fullName, expected) => {
    expect(displayNameFor(fullName, 'arc_1')).toBe(expected);
  });

  it('recorta a 100 caracteres (la columna)', () => {
    expect(displayNameFor('x'.repeat(150), 'arc_1')).toHaveLength(100);
  });
});

describe('HANDLE_PATTERN', () => {
  it.each(['ana', 'arc_1234abcd', 'a_b_c', 'x'.repeat(30)])('acepta %s', (handle) => {
    expect(HANDLE_PATTERN.test(handle)).toBe(true);
  });

  it.each(['ab', 'x'.repeat(31), 'Ana', 'ana@piic.mx', 'a.b', 'a-b', 'a b'])(
    'rechaza %s',
    (handle) => {
      expect(HANDLE_PATTERN.test(handle)).toBe(false);
    }
  );
});
