import { describe, it, expect } from 'vitest';
import { SYSTEM_VERSION, BRANDING_NAME, CACHE_PREFIX } from './versionConstants';

/**
 * Guardia anti-regresión: la versión del sistema se inyecta en build-time
 * (__ARCHON_VERSION__) y todo derivado debe calcularse de SYSTEM_VERSION.
 * Si alguien vuelve a hardcodear una versión, estos tests lo delatan.
 */
describe('versionConstants — versión dinámica de build', () => {
  it('SYSTEM_VERSION tiene formato semántico X.Y.Z inyectado en build-time', () => {
    expect(SYSTEM_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('SYSTEM_VERSION no es el valor hardcodeado histórico', () => {
    expect(SYSTEM_VERSION).not.toBe('78.100.206');
  });

  it('BRANDING_NAME deriva de SYSTEM_VERSION', () => {
    expect(BRANDING_NAME).toBe(`Archon Fleet System | V.${SYSTEM_VERSION}`);
  });

  it('CACHE_PREFIX deriva de SYSTEM_VERSION (invalidación de cache por deploy)', () => {
    expect(CACHE_PREFIX).toBe(`archon_v${SYSTEM_VERSION.replace(/\./g, '_')}_hardened`);
  });
});
