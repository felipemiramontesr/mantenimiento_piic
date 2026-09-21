import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import type { LightMyRequestResponse } from 'fastify';
import buildApp from '../index';
import db from '../services/db';

/**
 * FC192 — PATCH /v1/cosmology/universes/:tenantId/label (Gherkin Scenarios 1, 2 y 4 + T1).
 * Se ejercita la ruta REAL con el servicio real y una conexión de BD simulada: el orden de las
 * consultas de la TX, el ROLLBACK y la auditoría se verifican contra ese `getConnection`.
 */

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => v.replace('enc_', '')),
  },
}));

const mockConnection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  execute: vi.fn(),
};

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));

const URL_RENAME = '/v1/cosmology/universes/9/label';
const IDENTITY_ROW = { id: 9, label: 'Universo Alpha', code: 'UNIV_ALPHA_A1B2C3' };

describe('FC192 — PATCH /v1/cosmology/universes/:tenantId/label', () => {
  const app = buildApp();
  let omegaHeader: Record<string, string>;
  let arcHeader: Record<string, string>;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    omegaHeader = {
      authorization: `Bearer ${jwt.sign({
        id: 1,
        username: 'GrayMan',
        roleId: 0,
        roleName: 'GrayMan',
        permissions: ['*'],
      })}`,
    };
    arcHeader = {
      authorization: `Bearer ${jwt.sign({
        id: 20,
        username: 'arc.user',
        roleId: 3,
        permissions: ['fleet:view'],
      })}`,
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    mockConnection.execute.mockReset();
  });

  const queueSuccess = (): void => {
    mockConnection.execute
      .mockResolvedValueOnce([[IDENTITY_ROW]]) // findUniverseIdentityForUpdate
      .mockResolvedValueOnce([[]]) // findUniverseIdByLabel → sin colisión
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE tenants
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE common_catalogs
  };

  const rename = (payload?: object): Promise<LightMyRequestResponse> =>
    app.inject({ method: 'PATCH', url: URL_RENAME, headers: omegaHeader, payload });

  it('Scenario 1 — Ω renombra: 200 {id, code, label}; tenants Y common_catalogs se actualizan en la misma TX; auditado', async () => {
    queueSuccess();

    const res = await rename({ label: '  Universo    Beta ' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      success: true,
      universe: { id: 9, code: 'UNIV_ALPHA_A1B2C3', label: 'Universo Beta' },
    });
    const statements = mockConnection.execute.mock.calls.map((c) => String(c[0]));
    expect(statements[2]).toBe('UPDATE tenants SET label = ? WHERE id = ?');
    expect(statements[3]).toContain('UPDATE common_catalogs SET label = ?');
    expect(mockConnection.execute.mock.calls[2][1]).toEqual(['Universo Beta', 9]);
    expect(mockConnection.commit).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO administrative_audit_logs'),
      expect.arrayContaining([
        'universe',
        '9',
        'UPDATE',
        'UNIVERSE_LABEL_RENAMED',
        expect.stringContaining('"actorRole":"GrayMan"'),
      ])
    );
  });

  it('Scenario 2 — nombre ya usado por otro universo (otras mayúsculas/espacios): 409 UNIVERSE_NAME_ALREADY_EXISTS, ROLLBACK, 0 UPDATE', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([[IDENTITY_ROW]])
      .mockResolvedValueOnce([[{ id: 7 }]]); // colisión

    const res = await rename({ label: '  flota   central  ' });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ success: false, code: 'UNIVERSE_NAME_ALREADY_EXISTS' });
    expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).not.toHaveBeenCalled();
    expect(mockConnection.execute).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['2 caracteres', 'ab'],
    ['101 caracteres', 'a'.repeat(101)],
    ['solo espacios', '      '],
    ['vacío', ''],
  ])('T1 — label inválido (%s): 400 INVALID_LABEL_LENGTH y 0 consultas', async (_case, label) => {
    const res = await rename({ label });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      success: false,
      code: 'INVALID_LABEL_LENGTH',
      field: 'label',
    });
    expect(mockConnection.beginTransaction).not.toHaveBeenCalled();
  });

  it('T1 — body ausente o sin label: 400 VALIDATION_ERROR (el culpable no es la longitud del label)', async () => {
    const noBody = await rename();
    const noLabel = await rename({ otro: 'x' });

    expect(noBody.statusCode).toBe(400);
    expect(noBody.json()).toEqual({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Solicitud inválida',
    });
    expect(noLabel.statusCode).toBe(400);
    expect(noLabel.json()).toMatchObject({ code: 'INVALID_LABEL_LENGTH' });
  });

  it('T1 — :tenantId que no es un entero positivo: 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/cosmology/universes/abc/label',
      headers: omegaHeader,
      payload: { label: 'Universo Beta' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false, code: 'VALIDATION_ERROR' });
  });

  it('T1 — universo inexistente: 404 TENANT_NOT_FOUND y ROLLBACK', async () => {
    mockConnection.execute.mockResolvedValueOnce([[]]); // findUniverseIdentityForUpdate → nada

    const res = await rename({ label: 'Universo Beta' });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'TENANT_NOT_FOUND' });
    expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
  });

  it('sincronía: common_catalogs afecta 0 filas ⇒ 500 UNIVERSE_CATALOG_DESYNC y ROLLBACK (no queda una tabla stale)', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([[IDENTITY_ROW]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await rename({ label: 'Universo Beta' });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ code: 'UNIVERSE_CATALOG_DESYNC' });
    expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).not.toHaveBeenCalled();
  });

  it('Scenario 4 — sin token: 401; usuario que no es Ω: 403; en ambos casos 0 consultas', async () => {
    const anonymous = await app.inject({
      method: 'PATCH',
      url: URL_RENAME,
      payload: { label: 'Universo Beta' },
    });
    const arc = await app.inject({
      method: 'PATCH',
      url: URL_RENAME,
      headers: arcHeader,
      payload: { label: 'Universo Beta' },
    });

    expect(anonymous.statusCode).toBe(401);
    expect(arc.statusCode).toBe(403);
    expect(mockConnection.beginTransaction).not.toHaveBeenCalled();
    expect(db.execute).not.toHaveBeenCalled();
  });
});
