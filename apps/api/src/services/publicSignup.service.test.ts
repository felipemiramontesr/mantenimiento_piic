import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { hash as argon2Hash } from '@node-rs/argon2';
import * as CosmologyRepository from './cosmology.repository';
import * as PublicSignupRepository from './publicSignup.repository';
import { findUserByEmail } from './authSession.service';
import { publicSignup, PublicSignupInput } from './publicSignup.service';

/**
 * FC177 F2 — unit-tests `publicSignup.service.ts` in isolation (every collaborator mocked at
 * module boundary, same pattern as `universeAdminSeed.test.ts`). Route/HTTP-shape integration
 * coverage lives in `routes/publicSignup.test.ts`.
 */

vi.mock('./db', () => ({
  default: { getConnection: vi.fn() },
}));
vi.mock('./cosmology.repository', () => ({
  usernameExists: vi.fn(),
  insertSeedUser: vi.fn(),
}));
vi.mock('./publicSignup.repository', () => ({ insertBillingProfile: vi.fn() }));
vi.mock('./authSession.service', () => ({ findUserByEmail: vi.fn() }));
vi.mock('@node-rs/argon2', () => ({ hash: vi.fn() }));
vi.mock('./encryption', () => ({ default: { encrypt: vi.fn((v: string) => `enc_${v}`) } }));

// eslint-disable-next-line import/first
import db from './db';

const INPUT: PublicSignupInput = {
  fullName: 'Cliente Ejemplo',
  email: 'cliente@ejemplo.mx',
  password: 'PasswordSegura123',
  rfc: 'XAXX010101000',
  razonSocial: 'Cliente Ejemplo SA de CV',
  regimenFiscal: '601',
  codigoPostalFiscal: '06600',
  usoCfdi: 'G03',
  telefono: '5551234567',
};

function mockConnection(): {
  beginTransaction: Mock;
  commit: Mock;
  rollback: Mock;
  release: Mock;
} {
  return {
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  };
}

describe('FC177 F2 — publicSignup()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (findUserByEmail as Mock).mockResolvedValue(null);
    (CosmologyRepository.usernameExists as Mock).mockResolvedValue(false);
    (argon2Hash as Mock).mockResolvedValue('hashed_pw');
  });

  it('Scenario 1 — happy path: crea el usuario en cuarentena + billing profile, misma TX', async () => {
    const conn = mockConnection();
    (db.getConnection as Mock).mockResolvedValue(conn);
    (CosmologyRepository.insertSeedUser as Mock).mockResolvedValue(501);

    const result = await publicSignup(INPUT);

    expect(result).toEqual({ ok: true, userId: 501 });
    expect(CosmologyRepository.insertSeedUser).toHaveBeenCalledWith(
      'cliente@ejemplo.mx',
      'Cliente Ejemplo',
      'enc_cliente@ejemplo.mx',
      'hashed_pw',
      false, // FC177 F2 — nace en cuarentena, nunca activo
      conn
    );
    expect(PublicSignupRepository.insertBillingProfile).toHaveBeenCalledWith(
      501,
      {
        rfc: 'XAXX010101000',
        razonSocial: 'Cliente Ejemplo SA de CV',
        regimenFiscal: '601',
        codigoPostalFiscal: '06600',
        usoCfdi: 'G03',
        telefono: '5551234567',
      },
      conn
    );
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });

  it('email ya usado por una cuenta activa → 409 SIGNUP_CONFLICT genérico, 0 TX abierta', async () => {
    (findUserByEmail as Mock).mockResolvedValue({ id: 5 });

    const result = await publicSignup(INPUT);

    expect(result).toEqual({
      ok: false,
      status: 409,
      code: 'SIGNUP_CONFLICT',
      message: expect.any(String),
    });
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it('username (=email) ya tomado por una fila ajena → mismo 409 SIGNUP_CONFLICT genérico (anti-enumeración)', async () => {
    (CosmologyRepository.usernameExists as Mock).mockResolvedValue(true);

    const result = await publicSignup(INPUT);

    expect(result).toEqual({
      ok: false,
      status: 409,
      code: 'SIGNUP_CONFLICT',
      message: expect.any(String),
    });
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it('rollback total si la escritura del billing profile falla a medio camino', async () => {
    const conn = mockConnection();
    (db.getConnection as Mock).mockResolvedValue(conn);
    (CosmologyRepository.insertSeedUser as Mock).mockResolvedValue(501);
    (PublicSignupRepository.insertBillingProfile as Mock).mockRejectedValue(
      new Error('DB write failed')
    );

    await expect(publicSignup(INPUT)).rejects.toThrow('DB write failed');
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
});
