import { describe, it, expect, beforeEach, vi } from 'vitest';
import { archonCache } from './archonCache';
import { CACHE_PREFIX, SYSTEM_VERSION } from '../constants/versionConstants';

describe('archonCache', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sets and gets data correctly', () => {
    archonCache.set('test_key', { foo: 'bar' });
    const data = archonCache.get<{ foo: string }>('test_key');
    expect(data).toEqual({ foo: 'bar' });
  });

  it('returns null for missing key', () => {
    const data = archonCache.get('missing_key');
    expect(data).toBeNull();
  });

  it('handles version mismatch and clears invalid cache', () => {
    // Force a Major version mismatch (using version 1.x vs 78.x)
    localStorage.setItem(
      `${CACHE_PREFIX}old_key`,
      JSON.stringify({ data: 'test', meta: { version: '1.0.0', timestamp: Date.now() } })
    );
    const data = archonCache.get('old_key');
    expect(data).toBeNull();
    // Verify it was actually removed
    expect(localStorage.getItem(`${CACHE_PREFIX}old_key`)).toBeNull();
  });

  it('persists data across minor version changes', () => {
    // Dynamically use the current Major version to simulate a minor update
    const [major] = SYSTEM_VERSION.split('.');
    localStorage.setItem(
      `${CACHE_PREFIX}minor_key`,
      JSON.stringify({
        data: 'persistent',
        meta: { version: `${major}.99.0`, timestamp: Date.now() },
      })
    );
    const data = archonCache.get('minor_key');
    expect(data).toBe('persistent');
  });

  it('handles malformed JSON payload in get', () => {
    localStorage.setItem(`${CACHE_PREFIX}bad_key`, '{ invalid_json');
    const data = archonCache.get('bad_key');
    expect(data).toBeNull();
  });

  it('handles localStorage errors gracefully in set', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation((): void => {
      /* no-op */
    });

    archonCache.set('key', 'value');

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'ArchonCache: Failed to write to persistence',
      expect.any(Error)
    );

    setItemSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('clears specific key', () => {
    archonCache.set('key1', 'val1');
    archonCache.set('key2', 'val2');
    archonCache.clear('key1');

    expect(archonCache.get('key1')).toBeNull();
    expect(archonCache.get('key2')).toBe('val2');
  });

  it('clears all prefixed keys', () => {
    archonCache.set('key1', 'val1');
    archonCache.set('key2', 'val2');
    localStorage.setItem('other_system_key', 'should_stay');

    archonCache.clear();

    expect(archonCache.get('key1')).toBeNull();
    expect(archonCache.get('key2')).toBeNull();
    expect(localStorage.getItem('other_system_key')).toBe('should_stay');
  });
});
