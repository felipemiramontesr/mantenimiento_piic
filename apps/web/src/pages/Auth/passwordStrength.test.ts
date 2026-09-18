import { describe, it, expect } from 'vitest';
import { computePasswordStrength } from './passwordStrength';

describe('computePasswordStrength', () => {
  it('nivel 0 (muy débil) para menos de 8 caracteres', () => {
    expect(computePasswordStrength('abc12').level).toBe(0);
  });

  it('nivel 1 (débil) para 8-9 caracteres con poca diversidad de clases', () => {
    expect(computePasswordStrength('abcdefgh').level).toBe(1);
  });

  it('nivel 2 (media) con 10+ caracteres y 2 clases', () => {
    expect(computePasswordStrength('abcdefgh12').level).toBe(2);
  });

  it('nivel 3 (fuerte) con 12+ caracteres y 3 clases', () => {
    expect(computePasswordStrength('Abcdefgh123').level).toBeGreaterThanOrEqual(2);
    expect(computePasswordStrength('Abcdefghij12').level).toBe(3);
  });

  it('nivel 4 (muy fuerte) con 14+ caracteres y las 4 clases', () => {
    expect(computePasswordStrength('Abcdefghij123!').level).toBe(4);
  });

  it('un solo carácter repetido nunca pasa de nivel 1, sin importar la longitud', () => {
    expect(computePasswordStrength('aaaaaaaaaaaaaaaa').level).toBe(1);
  });

  it('"password123" (patrón obvio conocido) queda topado en nivel 1 pese a cumplir longitud', () => {
    const result = computePasswordStrength('password123!');
    expect(result.level).toBe(1);
  });

  it('"12345678" secuencial queda topado en nivel 1', () => {
    expect(computePasswordStrength('12345678').level).toBe(1);
  });

  it('cada nivel trae una etiqueta y una sugerencia no vacías', () => {
    const result = computePasswordStrength('Abcdefghij123!');
    expect(result.label.length).toBeGreaterThan(0);
    expect(result.suggestion.length).toBeGreaterThan(0);
  });

  it('cadena vacía es nivel 0', () => {
    expect(computePasswordStrength('').level).toBe(0);
  });
});
