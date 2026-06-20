import { describe, it, expect, vi } from 'vitest';
import { deriveOwnerHandle, resolveUniqueHandle } from './ownerHandle';

describe('deriveOwnerHandle', () => {
  it('OH-1: uses first 6 chars of RFC when RFC length >= 6', () => {
    expect(deriveOwnerHandle('VIM', 'VAGC780101ABC', 'unused')).toBe('VIM-VAGC78');
  });

  it('OH-2: pads RFC to 6 chars with zeros when RFC is present but short', () => {
    expect(deriveOwnerHandle('ERP', 'ABC', 'unused')).toBe('ERP-ABC000');
  });

  it('OH-3: falls back to username when RFC is null', () => {
    expect(deriveOwnerHandle('VIM', null, 'jperez')).toBe('VIM-JPEREZ');
  });

  it('OH-4: falls back to username when RFC is empty string', () => {
    expect(deriveOwnerHandle('VIM', '', 'anakaren')).toBe('VIM-ANAKARE'.slice(0, 10));
  });

  it('OH-5: strips non-alphanumeric characters from RFC before derivation', () => {
    // RFC with spaces or dashes should be cleaned
    expect(deriveOwnerHandle('ERP', 'RFC TEST001', 'unused')).toBe('ERP-RFCTES');
  });

  it('OH-6: uppercases suite prefix', () => {
    expect(deriveOwnerHandle('vim', 'VAGC780101', 'x')).toBe('VIM-VAGC78');
  });

  it('OH-7: pads username to 6 chars with zeros when short', () => {
    expect(deriveOwnerHandle('VIM', null, 'AB')).toBe('VIM-AB0000');
  });

  it('OH-8: handle is always exactly {SUITE}-{6CHARS} format (length check)', () => {
    const h = deriveOwnerHandle('VIM', 'VAGC780101MHN', 'user');
    expect(h).toMatch(/^VIM-[A-Z0-9]{6}$/);
  });

  it('OH-9: result fits in VARCHAR(20) even with long suites', () => {
    const h = deriveOwnerHandle('LONGSUITE', 'ABC123', 'user');
    expect(h.length).toBeLessThanOrEqual(20);
  });
});

describe('resolveUniqueHandle', () => {
  const makeConn = (rowResults: unknown[][]): { execute: ReturnType<typeof vi.fn> } => {
    const mockFn = vi.fn();
    rowResults.forEach((rows) => {
      mockFn.mockResolvedValueOnce([rows, undefined]);
    });
    return { execute: mockFn };
  };

  it('RUH-1: returns base handle when no collision exists', async () => {
    const conn = makeConn([[]]); // [] = empty rows → no collision
    const result = await resolveUniqueHandle(conn, 'VIM', 'VAGC780101', 'user');
    expect(result).toBe('VIM-VAGC78');
    expect(conn.execute).toHaveBeenCalledTimes(1);
  });

  it('RUH-2: returns candidate with suffix when base collides', async () => {
    const conn = makeConn([[{ id: 1 }], []]); // first call: collision, second: free
    const result = await resolveUniqueHandle(conn, 'VIM', 'VAGC780101', 'user');
    expect(result).toMatch(/^VIM-VAGC78-[A-Z0-9]{3}$/);
    expect(conn.execute).toHaveBeenCalledTimes(2);
  });

  it('RUH-3: throws HANDLE_COLLISION when both base and candidate collide', async () => {
    const conn = makeConn([[{ id: 1 }], [{ id: 2 }]]); // both collide
    await expect(resolveUniqueHandle(conn, 'VIM', 'VAGC780101', 'user')).rejects.toThrow(
      'HANDLE_COLLISION'
    );
  });

  it('RUH-4: queries with correct SQL for handle lookup', async () => {
    const conn = makeConn([[]]); // no collision
    await resolveUniqueHandle(conn, 'ERP', 'RFC_TEST001', 'jperez');
    expect(conn.execute).toHaveBeenCalledWith('SELECT id FROM owners WHERE handle = ? LIMIT 1', [
      'ERP-RFCTES',
    ]);
  });

  it('RUH-5: uses username fallback when RFC is null', async () => {
    const conn = makeConn([[]]); // no collision
    const result = await resolveUniqueHandle(conn, 'VIM', null, 'cvalenzuela');
    expect(result).toBe('VIM-CVALEN');
  });
});
