import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Owner-Scoped Fleet Access (F1-A)
 * Feature Contract: Owner_Scoped_Fleet_Access_External_Client
 * Carriers of fleet:scoped only see units whose ownerId belongs to the
 * owners linked to them in user_fleet_owners. Deny-by-default.
 */

const mockConnection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([[], undefined]),
  query: vi.fn().mockResolvedValue([[], undefined]),
};

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v) => `enc_${v}`),
    decrypt: vi.fn((v) => (v && typeof v === 'string' ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v) => `hash_${v}`),
  },
}));

const OWNER_AS = 711;
const CLIENT_USER_ID = 42;

const scopedUnit = {
  id: 'ASM-001',
  uuid: 'uuid-as-1',
  assetType: 'Vehículo',
  ownerId: OWNER_AS,
  images: JSON.stringify([]),
  availabilityIndex: 100,
  odometer: 1000,
  nextServiceReading: 5000,
};

const VALID_PATCH_BODY = {
  data: { odometer: 15000 },
  reason: 'Actualización odometría mensual',
};

describe('Owner-Scoped Fleet Access (fleet:scoped)', () => {
  const app = buildApp();
  let scopedToken: string;
  let scopedWriteToken: string;
  let staffToken: string;
  let omnipotentToken: string;
  let fullWriteToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    scopedToken = jwt.sign({
      id: CLIENT_USER_ID,
      username: 'cliente.externo',
      roleId: 9,
      roleName: 'Cliente Externo',
      permissions: ['fleet:view', 'fleet:scoped'],
    });
    scopedWriteToken = jwt.sign({
      id: CLIENT_USER_ID,
      username: 'cliente.externo',
      roleId: 9,
      roleName: 'Cliente Externo',
      permissions: ['fleet:view', 'fleet:scoped', 'fleet:write:scoped'],
    });
    staffToken = jwt.sign({
      id: 7,
      username: 'staff',
      roleId: 1,
      roleName: 'Operador General',
      permissions: ['fleet:view'],
    });
    fullWriteToken = jwt.sign({
      id: 3,
      username: 'gestor',
      roleId: 4,
      roleName: 'Gestor de Flotilla',
      permissions: ['fleet:view', 'fleet:write'],
    });
    omnipotentToken = jwt.sign({
      id: 0,
      username: 'archon',
      roleId: 0,
      roleName: 'Master (Archon)',
      permissions: ['*'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as Mock).mockReset();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
  });

  const authHeader = (token: string): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
  });

  describe('GET /v1/fleet — scoped list (S1)', () => {
    it('returns only units of the linked owners and filters the SQL by ownerId', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_AS }], undefined]) // owners lookup
        .mockResolvedValueOnce([[scopedUnit], undefined]) // scoped fleet query
        .mockResolvedValueOnce([[], undefined]) // KPI MTTR
        .mockResolvedValueOnce([[], undefined]) // KPI MTBF
        .mockResolvedValueOnce([[], undefined]); // KPI BCK

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: authHeader(scopedToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.count).toBe(1);
      expect(body.data[0].id).toBe('ASM-001');

      const { calls } = (db.execute as Mock).mock;
      // 1st query resolves the user's owners
      expect(calls[0][0]).toContain('user_fleet_owners');
      expect(calls[0][1]).toEqual([CLIENT_USER_ID]);
      // 2nd query is the fleet list filtered by those owners
      expect(calls[1][0]).toContain('f.ownerId IN');
      expect(calls[1][1]).toEqual([OWNER_AS]);
    });
  });

  describe('GET /v1/fleet — deny-by-default (S3)', () => {
    it('returns an empty list without querying fleet when the user has no linked owners', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // owners lookup → none

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: authHeader(scopedToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.count).toBe(0);
      expect(body.data).toEqual([]);
      // Only the owners lookup ran — the fleet table was never queried
      expect(db.execute as Mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /v1/fleet/:id — anti-IDOR guard (S2)', () => {
    it('returns 404 when the unit belongs to another owner', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_AS }], undefined]) // owners lookup
        .mockResolvedValueOnce([[], undefined]); // unit query scoped → no row

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet/FOREIGN-01',
        headers: authHeader(scopedToken),
      });

      expect(response.statusCode).toBe(404);

      const { calls } = (db.execute as Mock).mock;
      expect(calls[1][0]).toContain('f.ownerId IN');
      expect(calls[1][1]).toEqual(['FOREIGN-01', OWNER_AS]);
    });

    it('returns 404 without querying fleet when the user has no linked owners', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // owners lookup → none

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(scopedToken),
      });

      expect(response.statusCode).toBe(404);
      expect(db.execute as Mock).toHaveBeenCalledTimes(1);
    });

    it('returns 200 when the unit belongs to a linked owner', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_AS }], undefined]) // owners lookup
        .mockResolvedValueOnce([[scopedUnit], undefined]) // unit query scoped → row
        .mockResolvedValueOnce([[], undefined]) // KPI MTTR
        .mockResolvedValueOnce([[], undefined]) // KPI MTBF
        .mockResolvedValueOnce([[], undefined]); // KPI BCK

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(scopedToken),
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data.id).toBe('ASM-001');
    });
  });

  describe('PATCH /v1/fleet/:id — scoped write + anti-IDOR (S5)', () => {
    it('returns 403 when user has neither fleet:write nor fleet:write:scoped', async (): Promise<void> => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(scopedToken),
        payload: VALID_PATCH_BODY,
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 403 when user only has fleet:view (staff without write)', async (): Promise<void> => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(staffToken),
        payload: VALID_PATCH_BODY,
      });

      expect(response.statusCode).toBe(403);
    });

    it('allows PATCH on owned unit with fleet:write:scoped (anti-IDOR pass)', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_AS }], undefined]) // owners lookup
        .mockResolvedValueOnce([[scopedUnit], undefined]) // getUnitById scoped → found
        .mockResolvedValueOnce([[], undefined]); // KPIs for getUnitById (MTTR)

      const mockConn = {
        beginTransaction: vi.fn(),
        execute: vi
          .fn()
          .mockResolvedValueOnce([[scopedUnit], undefined]) // snapshot SELECT
          .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // UPDATE
          .mockResolvedValueOnce([{ insertId: 1 }, undefined]), // forensic INSERT
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      (db.getConnection as unknown as Mock).mockResolvedValue(mockConn);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(scopedWriteToken),
        payload: VALID_PATCH_BODY,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });

    it('returns 404 when scoped writer targets a foreign unit (anti-IDOR block)', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_AS }], undefined]) // owners lookup
        .mockResolvedValueOnce([[], undefined]); // getUnitById scoped → not found

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/FOREIGN-99',
        headers: authHeader(scopedWriteToken),
        payload: VALID_PATCH_BODY,
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 404 when scoped writer has no linked owners (deny-by-default)', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // owners lookup → none

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(scopedWriteToken),
        payload: VALID_PATCH_BODY,
      });

      expect(response.statusCode).toBe(404);
    });

    it('full fleet:write bypasses owner-scope check entirely', async (): Promise<void> => {
      const mockConn = {
        beginTransaction: vi.fn(),
        execute: vi
          .fn()
          .mockResolvedValueOnce([[scopedUnit], undefined]) // snapshot SELECT
          .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // UPDATE
          .mockResolvedValueOnce([{ insertId: 1 }, undefined]), // forensic INSERT
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      (db.getConnection as unknown as Mock).mockResolvedValue(mockConn);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(fullWriteToken),
        payload: VALID_PATCH_BODY,
      });

      expect(response.statusCode).toBe(200);
      // owners lookup must NOT have been called (no fleet:scoped on this token)
      expect(db.execute as Mock).not.toHaveBeenCalled();
    });
  });

  describe('Zero regression for non-scoped carriers (S4)', () => {
    it('staff with plain fleet:view keeps full unscoped access', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[scopedUnit], undefined]) // fleet query (first call — no owners lookup)
        .mockResolvedValueOnce([[], undefined]) // KPI MTTR
        .mockResolvedValueOnce([[], undefined]) // KPI MTBF
        .mockResolvedValueOnce([[], undefined]); // KPI BCK

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: authHeader(staffToken),
      });

      expect(response.statusCode).toBe(200);
      const { calls } = (db.execute as Mock).mock;
      expect(calls[0][0]).not.toContain('user_fleet_owners');
      expect(calls[0][0]).not.toContain('f.ownerId IN');
    });

    it('omnipotent (*) bypasses scoping even if fleet:scoped were present', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[scopedUnit], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: authHeader(omnipotentToken),
      });

      expect(response.statusCode).toBe(200);
      expect((db.execute as Mock).mock.calls[0][0]).not.toContain('user_fleet_owners');
    });
  });
});
