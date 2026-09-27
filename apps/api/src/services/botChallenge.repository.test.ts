import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import db from './db';
import consumeNonce from './botChallenge.repository';

/** FC199 F3 — registro de un solo uso de retos PoW (`auth_challenge_nonces`, migración 180). */

vi.mock('./db', () => ({ default: { execute: vi.fn() } }));

const HASH = 'c'.repeat(64);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('consumeNonce', () => {
  it('primera vez: INSERT IGNORE parametrizado con la caducidad → true', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

    expect(await consumeNonce(HASH, 1790000000)).toBe(true);
    expect(db.execute).toHaveBeenCalledWith(
      'INSERT IGNORE INTO auth_challenge_nonces (nonce_hash, expires_at) VALUES (?, FROM_UNIXTIME(?))',
      [HASH, 1790000000]
    );
  });

  it('repetido: la PK ya existe, 0 filas → false (replay)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 0 }, undefined]);

    expect(await consumeNonce(HASH, 1790000000)).toBe(false);
  });
});
