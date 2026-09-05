import { describe, it, expect, afterEach, vi } from 'vitest';
import { redirectUserToLogin } from './navigation';

/**
 * FC162 F3 (100% mandatorio) — navigation.ts sin test previo. jsdom lanza
 * "Not implemented: navigation" al asignar window.location.href de verdad,
 * así que se reemplaza `window.location` por un stub escribible (patrón
 * estándar de Vitest para código que navega) y se verifica la asignación.
 */

describe('redirectUserToLogin', () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, 'location', { writable: true, value: originalLocation });
  });

  it('sets window.location.href to /login', () => {
    Object.defineProperty(window, 'location', { writable: true, value: { href: '' } });
    redirectUserToLogin();
    expect(window.location.href).toBe('/login');
  });

  // ── R4-C Fc165 F2 Slice 2.3C Batch 1 — unc line 4 (typeof window === 'undefined') ──
  it('does nothing when window is undefined (SSR guard)', () => {
    vi.stubGlobal('window', undefined);
    expect(() => redirectUserToLogin()).not.toThrow();
    vi.unstubAllGlobals();
  });
});
