/* global __ARCHON_VERSION__ */
/**
 * SYSTEM_VERSION se inyecta en build-time desde vite.config.ts (define __ARCHON_VERSION__):
 * env ARCHON_VERSION → último commit V.x.y.z → package.json raíz.
 * Prohibido hardcodear versiones aquí o en componentes — derivar siempre de SYSTEM_VERSION.
 */
export const SYSTEM_VERSION = __ARCHON_VERSION__;
export const BRANDING_NAME = `Archon Fleet System | V.${SYSTEM_VERSION}`;
export const CACHE_PREFIX = `archon_v${SYSTEM_VERSION.replace(/\./g, '_')}_hardened`;
export const SOVEREIGN_MODE = true;
export const LAST_SYNC = '2026-05-23T22:05:00.000Z';
export const ENABLE_DEBUG = true;
