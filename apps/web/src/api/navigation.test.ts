import { describe, it, expect, afterEach } from 'vitest';
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
});
