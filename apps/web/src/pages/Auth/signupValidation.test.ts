import { describe, it, expect } from 'vitest';
import { isValidRfc, isValidPostalCode, RFC_REGEX, POSTAL_CODE_REGEX } from './signupValidation';

/** FC184 F2 — mismos patrones que `apps/api/src/routes/publicSignup.ts` (Cond.R-177 R3); estos
 *  casos espejean los del backend (`publicSignup.test.ts`, caso SIGNUP-3) para mantener ambos en
 *  lockstep si alguno cambia sin el otro. */
describe('signupValidation', () => {
  describe('isValidRfc', () => {
    it('acepta un RFC de persona moral (12 caracteres)', () => {
      expect(isValidRfc('ABC010101AB9')).toBe(true);
    });

    it('acepta un RFC de persona física (13 caracteres)', () => {
      expect(isValidRfc('XAXX010101AB9')).toBe(true);
    });

    it('rechaza un RFC demasiado corto', () => {
      expect(isValidRfc('ABC0101')).toBe(false);
    });

    it('rechaza un RFC con la sección de fecha en formato incorrecto', () => {
      expect(isValidRfc('ABC01AB101AB9')).toBe(false);
    });

    it('rechaza cadena vacía', () => {
      expect(isValidRfc('')).toBe(false);
    });

    it('rechaza minúsculas (el formulario ya fuerza mayúsculas, pero el validador es estricto)', () => {
      expect(isValidRfc('abc010101ab9')).toBe(false);
    });

    it('RFC_REGEX exportado es el mismo patrón que usa isValidRfc', () => {
      expect(RFC_REGEX.test('ABC010101AB9')).toBe(true);
    });
  });

  describe('isValidPostalCode', () => {
    it('acepta 5 dígitos', () => {
      expect(isValidPostalCode('06600')).toBe(true);
    });

    it('rechaza menos de 5 dígitos', () => {
      expect(isValidPostalCode('660')).toBe(false);
    });

    it('rechaza caracteres no numéricos', () => {
      expect(isValidPostalCode('0660A')).toBe(false);
    });

    it('rechaza cadena vacía', () => {
      expect(isValidPostalCode('')).toBe(false);
    });

    it('POSTAL_CODE_REGEX exportado es el mismo patrón que usa isValidPostalCode', () => {
      expect(POSTAL_CODE_REGEX.test('06600')).toBe(true);
    });
  });
});
