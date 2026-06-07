/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

describe('Notifications Routes — Security & Behaviour', () => {
  const app = buildApp();
  let token: string;

  beforeAll(async () => {
    await app.ready();
    token = app.jwt.sign({
      id: 42,
      username: 'technician',
      roleId: 2,
      roleName: 'Tecnico',
      permissions: ['maintenance:write'],
    });
  });

  // ─── Auth guard ──────────────────────────────────────────────────────────────

  it('GET /v1/notifications — rejects unauthenticated with 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/notifications' });
    expect(res.statusCode).toBe(401);
  });

  it('PATCH /v1/notifications/1/read — rejects unauthenticated with 401', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/v1/notifications/1/read' });
    expect(res.statusCode).toBe(401);
  });

  // ─── GET /v1/notifications ───────────────────────────────────────────────────

  it('GET /v1/notifications — returns empty list when no notifications', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([[], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/notifications',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('GET /v1/notifications — maps rows correctly', async () => {
    const mockRow = {
      id: 7,
      type: 'MAINTENANCE_ALERT',
      priority: 'HIGH',
      title: 'Nuevo mantenimiento asignado',
      message: 'ASM-001 — El técnico debe aceptar o rechazar',
      metadata: { uuid: 'abc-123', vehicleId: 'ASM-001' },
      is_read: 0,
      created_at: new Date('2026-06-07T10:00:00Z'),
    };
    vi.mocked(db.execute).mockResolvedValueOnce([[mockRow], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/notifications',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: 7,
      type: 'MAINTENANCE_ALERT',
      priority: 'HIGH',
      isRead: false,
      metadata: { uuid: 'abc-123', vehicleId: 'ASM-001' },
    });
  });

  it('GET /v1/notifications — maps is_read=1 as isRead=true', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([
      [
        {
          id: 1,
          type: 'SYSTEM',
          priority: 'LOW',
          title: 'T',
          message: 'M',
          metadata: null,
          is_read: 1,
          created_at: '2026-06-01',
        },
      ],
      undefined,
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/notifications',
      headers: { authorization: `Bearer ${token}` },
    });

    const body = JSON.parse(res.body);
    expect(body.data[0].isRead).toBe(true);
  });

  // ─── PATCH /v1/notifications/:id/read ───────────────────────────────────────

  it('PATCH /v1/notifications/:id/read — 400 on non-numeric id', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/notifications/abc/read',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('PATCH /v1/notifications/:id/read — 404 when notification not owned by user', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([{ affectedRows: 0 }, undefined]);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/notifications/99/read',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('PATCH /v1/notifications/:id/read — 200 on success', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/notifications/7/read',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
  });
});
