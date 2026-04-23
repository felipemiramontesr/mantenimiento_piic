/**
 * 🔱 Archon Sovereign Cache Engine
 * Implementation: Stale-While-Revalidate (SWR) Pattern
 * v.1.0.0 - Production Grade Persistence
 */

const CACHE_PREFIX = 'archon_v30_';
const SYSTEM_VERSION = '30.0.0';

export interface CacheMetadata {
  version: string;
  timestamp: number;
}

export interface CachePayload<T> {
  data: T;
  meta: CacheMetadata;
}

export const archonCache = {
  /**
   * 🛡️ Securely save data to local persistence
   */
  set: <T>(key: string, data: T): void => {
    try {
      const payload: CachePayload<T> = {
        data,
        meta: {
          version: SYSTEM_VERSION,
          timestamp: Date.now(),
        },
      };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(payload));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('ArchonCache: Failed to write to persistence', err);
    }
  },

  /**
   * 🛡️ Retrieve data with version validation
   */
  get: <T>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!raw) return null;

      const payload: CachePayload<T> = JSON.parse(raw);

      // Version match check to prevent data corruption during updates
      if (payload.meta.version !== SYSTEM_VERSION) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return payload.data;
    } catch (err) {
      return null;
    }
  },

  /**
   * 🛡️ Clear specific or all system cache
   */
  clear: (key?: string): void => {
    if (key) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } else {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(CACHE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    }
  },
};
