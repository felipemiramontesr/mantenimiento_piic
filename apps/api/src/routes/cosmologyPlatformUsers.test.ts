import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * FC204 F3 — sovereign platform-users console API (Ω only).
 *  - GET /v1/cosmology/users: every cosmonaut with its Universo, filters and pagination.
 *  - Named-Universe confirmation on POST /v1/cosmology/users/:id/mfa/reset and DELETE /v1/auth/users/:id.
 *  - T1 of the FC: the 16 rows of AccionSoberanaPermitida(O, U, C, T) ≡ O ∧ U ∧ C ∧ T, guard order
 *    ¬O∧C → 403 · O∧C∧(¬U∨¬T) → 400 · ¬C → 404 · O∧U∧C∧T → 200 (R 485_AN).
 */

vi.mock('@node-rs/argon2', () => ({ hash: vi.fn().mockResolvedValue('argon2_seed_hash') }));
vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => (typeof v === 'string' ? v.replace('enc_', '') : v)),
  },
}));

const mockConnection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([[], undefined]),
};

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));

const UNIVERSE = 'Flota Norte';
const inUniverse = [[{ userId: 20, tenantId: 41, tenantName: UNIVERSE }], undefined];
const itinerant = [[{ userId: 20, tenantId: null, tenantName: null }], undefined];
const credential = [
  [{ id: 9, user_id: 20, type: 'totp', secret_encrypted: 'enc_x', is_confirmed: 1 }],
  undefined,
];

const app = buildApp();
let omegaToken: string;
let arcToken: string;

beforeAll(async () => {
  await app.ready();
  const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
  omegaToken = jwt.sign({ id: 1, username: 'GrayMan', roleId: 0, permissions: ['*'] });
  arcToken = jwt.sign({ id: 20, username: 'arc.user', roleId: 3, permissions: ['fleet:view'] });
});

beforeEach(() => {
  vi.clearAllMocks();
  (db.execute as Mock).mockReset().mockResolvedValue([[], undefined]);
  mockConnection.execute.mockReset().mockResolvedValue([[], undefined]);
});

const omegaHeader = (): Record<string, string> => ({ authorization: `Bearer ${omegaToken}` });
const arcHeader = (): Record<string, string> => ({ authorization: `Bearer ${arcToken}` });

describe('FC204 F3 — GET /v1/cosmology/users', () => {
  it('403 para un no-Ω, 0 query', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmology/users',
      headers: arcHeader(),
    });
    expect(res.statusCode).toBe(403);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it.each(['tenantId=0', 'tenantId=-3', 'tenantId=abc', 'pageSize=101', 'page=0'])(
    '400 VALIDATION_ERROR con ?%s',
    async (query) => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/cosmology/users?${query}`,
        headers: omegaHeader(),
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
    }
  );

  it('200 — lista todos: cada fila con su Universo (o null si es itinerante) y total', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([
        [
          {
            id: 20,
            username: 'arc.user',
            fullName: 'Arc User',
            email: 'enc_arc@piic.mx', // FC205 F1 — en la base va cifrado
            isActive: 1,
            tenantId: 41,
            tenantName: UNIVERSE,
            cosmonautType: 'ARC',
          },
          {
            id: 21,
            username: 'nomad',
            fullName: null,
            email: null, // FC205 F1 — sin correo → ''
            isActive: 0,
            tenantId: null,
            tenantName: null,
            cosmonautType: null,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[{ total: 2 }], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmology/users',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(2);
    expect(body.data[0]).toEqual({
      id: 20,
      username: 'arc.user',
      fullName: 'Arc User',
      email: 'arc@piic.mx',
      isActive: true,
      tenantId: 41,
      tenantName: UNIVERSE,
      cosmonautType: 'ARC',
    });
    expect(body.data[1]).toMatchObject({
      email: '',
      isActive: false,
      tenantId: null,
      tenantName: null,
    });
    const [sql, params] = (db.execute as Mock).mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain('WHERE');
    expect(params).toEqual([25, 0]);
  });

  it('filtro por Universo: m.owner_id = ? con su id, y paginación por OFFSET', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{}], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmology/users?tenantId=41&page=3&pageSize=10',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).total).toBe(0);
    const [sql, params] = (db.execute as Mock).mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('WHERE m.owner_id = ?');
    expect(params).toEqual([41, 10, 20]);
    const [countSql, countParams] = (db.execute as Mock).mock.calls[1] as [string, unknown[]];
    expect(countSql).toContain('COUNT(*)');
    expect(countParams).toEqual([41]);
  });

  it('filtro itinerante: usuarios sin membresía (m.id IS NULL)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmology/users?tenantId=itinerant',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(200);
    const [sql, params] = (db.execute as Mock).mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('WHERE m.id IS NULL');
    expect(params).toEqual([25, 0]);
  });

  // FC205 F1 (Escenario 2) — el correo va cifrado: ya no se busca con LIKE.
  it('búsqueda por nombre, usuario y RFC (sin u.email); % _ \\ tecleados son literales', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/cosmology/users?q=${encodeURIComponent('50%_x\\')}`,
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(200);
    const [sql, params] = (db.execute as Mock).mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('(u.full_name LIKE ? OR u.username LIKE ? OR ubp.rfc LIKE ?)');
    expect(sql).not.toContain('u.email LIKE');
    const like = '%50\\%\\_x\\\\%';
    expect(params).toEqual([like, like, like, 25, 0]);
  });
});

describe('FC204 F3 — confirmación nominal del Universo (reset 2FA y baja)', () => {
  const reset = (payload?: object): Promise<{ statusCode: number; body: string }> =>
    app.inject({
      method: 'POST',
      url: '/v1/cosmology/users/20/mfa/reset',
      headers: omegaHeader(),
      ...(payload ? { payload } : {}),
    });

  it('400 VALIDATION_ERROR sin confirmUniverseName, sin tocar la base', async () => {
    const res = await reset();
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('404 USER_NOT_FOUND si el usuario no existe', async () => {
    const res = await reset({ confirmUniverseName: UNIVERSE });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('USER_NOT_FOUND');
  });

  it('400 USER_WITHOUT_UNIVERSE para un Arc itinerante (T = ⊥, R 485_AN lectura 1)', async () => {
    (db.execute as Mock).mockResolvedValueOnce(itinerant);
    const res = await reset({ confirmUniverseName: UNIVERSE });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('USER_WITHOUT_UNIVERSE');
    expect(mockConnection.beginTransaction).not.toHaveBeenCalled();
  });

  it.each(['Flota Sur', 'flota norte'])(
    '400 UNIVERSE_NAME_MISMATCH con "%s" (otro nombre u otra capitalización)',
    async (typed) => {
      (db.execute as Mock).mockResolvedValueOnce(inUniverse);
      const res = await reset({ confirmUniverseName: typed });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('UNIVERSE_NAME_MISMATCH');
      expect(mockConnection.beginTransaction).not.toHaveBeenCalled();
    }
  );

  it('acepta el nombre con espacios alrededor (se recortan) y sigue al reset', async () => {
    (db.execute as Mock).mockResolvedValueOnce(inUniverse).mockResolvedValueOnce([[], undefined]);
    const res = await reset({ confirmUniverseName: `  ${UNIVERSE}  ` });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('MFA_NOT_ENROLLED'); // pasó la confirmación
  });

  it('DELETE /v1/auth/users/:id — 400 sin confirmUniverseName (antes bastaba el motivo)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/auth/users/20',
      headers: omegaHeader(),
      payload: { reason: 'Baja por depuración' },
    });
    expect(res.statusCode).toBe(400);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('DELETE /v1/auth/users/:id — 400 con un :id no numérico', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/auth/users/abc',
      headers: omegaHeader(),
      payload: { reason: 'Baja por depuración', confirmUniverseName: UNIVERSE },
    });
    expect(res.statusCode).toBe(400);
  });
});

type Row = { O: boolean; U: boolean; C: boolean; T: boolean; status: number };

/** The 16 rows of T1, in the FC's order (O, U, C, T), with the HTTP code each one must produce. */
const T1: Row[] = [true, false].flatMap((O) =>
  [true, false].flatMap((U) =>
    [true, false].flatMap((C) =>
      [true, false].map((T) => {
        let status = 200;
        if (!C) status = 404;
        else if (!O) status = 403;
        else if (!U || !T) status = 400;
        return { O, U, C, T, status };
      })
    )
  )
);

/** Mocks for one row: the user's Universo (T), and what the action needs to reach 200. */
function arrangeRow(row: Row, action: 'reset' | 'delete'): void {
  (db.execute as Mock).mockResolvedValueOnce(row.T ? inUniverse : itinerant);
  if (action === 'reset') {
    (db.execute as Mock).mockResolvedValueOnce(credential);
    return;
  }
  mockConnection.execute
    .mockResolvedValueOnce([[{ id: 20 }], undefined]) // snapshot before
    .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // delete
}

describe('FC204 T1 — 16 filas de AccionSoberanaPermitida(O, U, C, T)', () => {
  it('la matriz es exhaustiva y solo O ∧ U ∧ C ∧ T da 200', () => {
    expect(T1).toHaveLength(16);
    expect(T1.filter((row) => row.status === 200)).toEqual([
      { O: true, U: true, C: true, T: true, status: 200 },
    ]);
  });

  it.each(T1.map((row, i) => ({ ...row, n: i + 1 })))(
    'reset 2FA · fila $n: O=$O U=$U C=$C T=$T → $status',
    async (row) => {
      arrangeRow(row, 'reset');
      const res = await app.inject({
        method: 'POST',
        url: row.C ? '/v1/cosmology/users/20/mfa/reset' : '/v1/cosmology/users/20/mfa/purge',
        headers: row.O ? omegaHeader() : arcHeader(),
        payload: { confirmUniverseName: row.U ? UNIVERSE : 'Otro Universo' },
      });
      expect(res.statusCode).toBe(row.status);
    }
  );

  it.each(T1.map((row, i) => ({ ...row, n: i + 1 })))(
    'baja de usuario · fila $n: O=$O U=$U C=$C T=$T → $status',
    async (row) => {
      arrangeRow(row, 'delete');
      const res = await app.inject({
        method: 'DELETE',
        url: row.C ? '/v1/auth/users/20' : '/v1/auth/users/20/purge',
        headers: row.O ? omegaHeader() : arcHeader(),
        payload: {
          reason: 'Baja soberana de prueba',
          confirmUniverseName: row.U ? UNIVERSE : 'Otro Universo',
        },
      });
      expect(res.statusCode).toBe(row.status);
    }
  );
});

/**
 * FC206 F1 — POST /v1/cosmology/users/:id/link-universe: el cableado de la ruta (guard Ω, validación
 * del cuerpo y mapeo del resultado). Las 10 filas de T1 viven en universeDirectLink.service.test.ts.
 */
describe('FC206 F1 — POST /v1/cosmology/users/:id/link-universe', () => {
  const link = (
    headers: Record<string, string>,
    payload: object
  ): Promise<{ statusCode: number; body: string }> =>
    app.inject({ method: 'POST', url: '/v1/cosmology/users/20/link-universe', headers, payload });
  const BODY = { tenantId: 41, confirmUniverseName: UNIVERSE };

  it('T1 fila 10: un no-Ω recibe 403 sin tocar la base', async () => {
    const res = await link(arcHeader(), BODY);
    expect(res.statusCode).toBe(403);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it.each([
    ['sin tenantId', { confirmUniverseName: UNIVERSE }],
    ['tenantId 0', { tenantId: 0, confirmUniverseName: UNIVERSE }],
    ['sin nombre', { tenantId: 41 }],
    ['rol inventado', { ...BODY, role: 'OMEGA' }],
  ])('400 VALIDATION_ERROR %s', async (_label, payload) => {
    const res = await link(omegaHeader(), payload);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('el usuario no existe → 404 LINKED_USER_NOT_FOUND', async () => {
    const res = await link(omegaHeader(), BODY);
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('LINKED_USER_NOT_FOUND');
  });

  it('itinerante válido a Universo con MU → 200 como ARC (rol por defecto)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ is_active: 1 }], undefined]) // findUserActiveState
      .mockResolvedValueOnce([[], undefined]) // findTenantMembershipOwnerIds: itinerante
      .mockResolvedValueOnce([[{ rfc: 'XAXX010101000' }], undefined]) // findBillingProfile
      .mockResolvedValueOnce([[{ id: 41, label: UNIVERSE, mu_user_id: 5 }], undefined]) // destino
      .mockResolvedValueOnce([[{ id: 7 }], undefined]); // findArcCosmonautRoleId
    const res = await link(omegaHeader(), BODY);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ success: true, role: 'ARC' });
    const sqls = mockConnection.execute.mock.calls.map(([sql]) => String(sql));
    expect(sqls[0]).toContain(
      'INSERT INTO tenant_user_memberships (user_id, owner_id, cosmonaut_type)'
    );
    expect(mockConnection.execute.mock.calls[0][1]).toEqual([20, 41, 'ARC']);
    expect(sqls[1]).toContain('INSERT INTO cosmonaut_role_assignments');
    expect(mockConnection.execute.mock.calls[1][1]).toEqual([20, 7, 41, 1]);
    expect(mockConnection.commit).toHaveBeenCalled();
  });
});
