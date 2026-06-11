/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

vi.mock('../services/fleetService', () => ({
  default: {
    getAllUnits: vi.fn().mockResolvedValue([]),
    getUnitById: vi.fn().mockResolvedValue(null),
    createUnit: vi.fn().mockResolvedValue({ id: 'X' }),
    updateUnit: vi.fn().mockResolvedValue(true),
    deleteUnit: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../services/routeService', () => ({
  default: {
    startRoute: vi.fn().mockResolvedValue('uuid-1'),
    finishRoute: vi.fn().mockResolvedValue(undefined),
    reportIncident: vi.fn().mockResolvedValue(undefined),
    getIncidents: vi.fn().mockResolvedValue([]),
    getAllIncidents: vi.fn().mockResolvedValue([]),
    updateRoute: vi.fn().mockResolvedValue(undefined),
    deleteRoute: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/workOrderService', () => ({
  createWorkOrder: vi.fn(),
  previewWorkOrder: vi.fn(),
  updateTaskStatus: vi.fn(),
  closeWorkOrder: vi.fn(),
  getWorkOrder: vi.fn(),
  checkAndTimeoutStage5Orders: vi.fn().mockResolvedValue(0),
}));

describe('Admin Routes', () => {
  const app = buildApp();
  let adminToken: string;
  let omniToken: string;
  let noPermToken: string;

  beforeAll(async () => {
    await app.ready();
    adminToken = app.jwt.sign({
      id: 4,
      username: 'grayman',
      roleId: 0,
      roleName: 'ARCHON',
      permissions: ['system:manage_roles'],
    });
    omniToken = app.jwt.sign({
      id: 4,
      username: 'grayman',
      roleId: 0,
      roleName: 'ARCHON',
      permissions: ['*'],
    });
    noPermToken = app.jwt.sign({
      id: 2,
      username: 'operator',
      roleId: 2,
      roleName: 'Operator',
      permissions: ['fleet:view'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db).execute.mockResolvedValue([[], undefined]);
  });

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  // ─── Auth Guard ─────────────────────────────────────────────────────────────

  it('returns 401 with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/roles' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 with insufficient permissions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/roles',
      headers: auth(noPermToken),
    });
    expect(res.statusCode).toBe(403);
  });

  it('allows omnipotent (*) token through guard', async () => {
    vi.mocked(db).execute.mockResolvedValueOnce([
      [{ id: 1, name: 'Admin', description: '' }],
      undefined,
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/roles',
      headers: auth(omniToken),
    });
    expect(res.statusCode).toBe(200);
  });

  // ─── GET /v1/admin/roles-permissions ────────────────────────────────────────

  describe('GET /v1/admin/roles-permissions', () => {
    it('returns 200 with roles and permissions matrix', async () => {
      vi.mocked(db)
        .execute.mockResolvedValueOnce([[{ id: 1, name: 'Admin' }], undefined])
        .mockResolvedValueOnce([[{ id: 1, slug: 'fleet:view' }], undefined])
        .mockResolvedValueOnce([[{ role_id: 1, slug: 'fleet:view' }], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/roles-permissions',
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.roles).toHaveLength(1);
      expect(body.data.roles[0].permissions).toContain('fleet:view');
      expect(body.data.allPermissions).toHaveLength(1);
    });

    it('returns empty permissions for role with no assignments', async () => {
      vi.mocked(db)
        .execute.mockResolvedValueOnce([[{ id: 1, name: 'Admin' }], undefined])
        .mockResolvedValueOnce([[{ id: 1, slug: 'fleet:view' }], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/roles-permissions',
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.roles[0].permissions).toEqual([]);
    });

    it('returns 500 on db error', async () => {
      vi.mocked(db).execute.mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/roles-permissions',
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ─── GET /v1/admin/roles ────────────────────────────────────────────────────

  describe('GET /v1/admin/roles', () => {
    it('returns 200 with roles list', async () => {
      vi.mocked(db).execute.mockResolvedValueOnce([
        [{ id: 1, name: 'Admin', description: 'Administrators' }],
        undefined,
      ]);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/roles',
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });

    it('returns 500 on db error', async () => {
      vi.mocked(db).execute.mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({
        method: 'GET',
        url: '/v1/admin/roles',
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ─── POST /v1/admin/roles ────────────────────────────────────────────────────

  describe('POST /v1/admin/roles', () => {
    it('returns 400 on validation error (name too short)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/admin/roles',
        headers: auth(adminToken),
        payload: { name: 'x' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
    });

    it('returns 409 if role name already exists', async () => {
      vi.mocked(db).execute.mockResolvedValueOnce([[{ id: 5 }], undefined]);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/admin/roles',
        headers: auth(adminToken),
        payload: { name: 'ExistingRole' },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().code).toBe('CONFLICT');
    });

    it('returns 201 on success', async () => {
      vi.mocked(db)
        .execute.mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([{ insertId: 10 }, undefined]);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/admin/roles',
        headers: auth(adminToken),
        payload: { name: 'NewRole', description: 'A new role' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().data.id).toBe(10);
      expect(res.json().data.name).toBe('NewRole');
    });

    it('returns 500 on db error', async () => {
      vi.mocked(db).execute.mockRejectedValueOnce(new Error('DB error'));
      const res = await app.inject({
        method: 'POST',
        url: '/v1/admin/roles',
        headers: auth(adminToken),
        payload: { name: 'SomeRole' },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ─── PATCH /v1/admin/roles/:roleId ──────────────────────────────────────────

  describe('PATCH /v1/admin/roles/:roleId', () => {
    it('returns 400 for NaN roleId', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/admin/roles/abc',
        headers: auth(adminToken),
        payload: { name: 'NewName' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when nothing to update', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/admin/roles/1',
        headers: auth(adminToken),
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toBe('Nada que actualizar');
    });

    it('returns 404 when role not found', async () => {
      vi.mocked(db).execute.mockResolvedValueOnce([[], undefined]);
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/admin/roles/999',
        headers: auth(adminToken),
        payload: { name: 'NewName' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 200 updating name only', async () => {
      vi.mocked(db)
        .execute.mockResolvedValueOnce([[{ id: 1 }], undefined])
        .mockResolvedValueOnce([{}, undefined]);
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/admin/roles/1',
        headers: auth(adminToken),
        payload: { name: 'UpdatedRole' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it('returns 200 updating description only', async () => {
      vi.mocked(db)
        .execute.mockResolvedValueOnce([[{ id: 1 }], undefined])
        .mockResolvedValueOnce([{}, undefined]);
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/admin/roles/1',
        headers: auth(adminToken),
        payload: { description: 'New description' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 500 on db error', async () => {
      vi.mocked(db).execute.mockRejectedValueOnce(new Error('DB error'));
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/admin/roles/1',
        headers: auth(adminToken),
        payload: { name: 'UpdatedRole' },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ─── DELETE /v1/admin/roles/:roleId ─────────────────────────────────────────

  describe('DELETE /v1/admin/roles/:roleId', () => {
    it('returns 400 for roleId = 0 (Archon protection)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/admin/roles/0',
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for NaN roleId', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/admin/roles/abc',
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 when role not found', async () => {
      vi.mocked(db).execute.mockResolvedValueOnce([[], undefined]);
      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/admin/roles/99',
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 409 when role has assigned users', async () => {
      vi.mocked(db)
        .execute.mockResolvedValueOnce([[{ id: 1 }], undefined])
        .mockResolvedValueOnce([[{ cnt: 3 }], undefined]);
      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/admin/roles/1',
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(409);
    });

    it('returns 200 on success', async () => {
      vi.mocked(db)
        .execute.mockResolvedValueOnce([[{ id: 1 }], undefined])
        .mockResolvedValueOnce([[{ cnt: 0 }], undefined])
        .mockResolvedValueOnce([{}, undefined]);
      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/admin/roles/1',
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it('returns 500 on db error', async () => {
      vi.mocked(db).execute.mockRejectedValueOnce(new Error('DB error'));
      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/admin/roles/1',
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ─── PUT /v1/admin/roles/:roleId/permissions ─────────────────────────────────

  describe('PUT /v1/admin/roles/:roleId/permissions', () => {
    const makeConn = () => ({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      execute: vi.fn().mockResolvedValue([[], undefined]),
    });

    it('returns 400 for roleId = 0', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/v1/admin/roles/0/permissions',
        headers: auth(adminToken),
        payload: { permissions: [] },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 on validation error (permissions not array)', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/v1/admin/roles/1/permissions',
        headers: auth(adminToken),
        payload: { permissions: 'not-array' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 when role not found', async () => {
      const conn = makeConn();
      conn.execute.mockResolvedValueOnce([[], undefined]);
      vi.mocked(db).getConnection.mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'PUT',
        url: '/v1/admin/roles/1/permissions',
        headers: auth(adminToken),
        payload: { permissions: [] },
      });
      expect(res.statusCode).toBe(404);
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });

    it('returns 200 with empty permissions (clears all)', async () => {
      const conn = makeConn();
      conn.execute
        .mockResolvedValueOnce([[{ id: 1 }], undefined])
        .mockResolvedValueOnce([{}, undefined]);
      vi.mocked(db).getConnection.mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'PUT',
        url: '/v1/admin/roles/1/permissions',
        headers: auth(adminToken),
        payload: { permissions: [] },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.permissions).toEqual([]);
      expect(conn.commit).toHaveBeenCalled();
    });

    it('returns 200 assigning permissions', async () => {
      const conn = makeConn();
      conn.execute
        .mockResolvedValueOnce([[{ id: 1 }], undefined])
        .mockResolvedValueOnce([{}, undefined])
        .mockResolvedValueOnce([[{ id: 1, slug: 'fleet:view' }], undefined])
        .mockResolvedValueOnce([{}, undefined]);
      vi.mocked(db).getConnection.mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'PUT',
        url: '/v1/admin/roles/1/permissions',
        headers: auth(adminToken),
        payload: { permissions: ['fleet:view'] },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.roleId).toBe(1);
    });

    it('returns 500 on transaction error', async () => {
      const conn = makeConn();
      conn.execute.mockRejectedValueOnce(new Error('TX error'));
      vi.mocked(db).getConnection.mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'PUT',
        url: '/v1/admin/roles/1/permissions',
        headers: auth(adminToken),
        payload: { permissions: ['fleet:view'] },
      });
      expect(res.statusCode).toBe(500);
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });
  });
});
