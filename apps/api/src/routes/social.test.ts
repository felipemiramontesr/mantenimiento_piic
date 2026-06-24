/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * FC-9 SocialNetwork_Multiverso FaseA — social_posts
 *
 * AT-SOC9-A-1: GET /social/posts → 401 sin JWT
 * AT-SOC9-A-2: GET /social/posts → 200 lista de posts
 * AT-SOC9-A-3: GET /social/posts?authorId=X → 200 filtrado por autor
 * AT-SOC9-A-4: POST /social/posts → 400 MISSING_REQUIRED_FIELDS
 * AT-SOC9-A-5: POST /social/posts → 400 PII_DETECTED_IN_POST (placa en content_text)
 * AT-SOC9-A-6: POST /social/posts → 201 created
 *
 * FC-9 SocialNetwork_Multiverso FaseB — reactions + comments
 *
 * AT-SOC9-B-1: POST /social/posts/:id/reactions → 401 sin JWT
 * AT-SOC9-B-2: POST /social/posts/:id/reactions → 400 INVALID_REACTION_TYPE
 * AT-SOC9-B-3: POST /social/posts/:id/reactions → 404 post not found
 * AT-SOC9-B-4: POST /social/posts/:id/reactions → 409 REACTION_ALREADY_EXISTS (Gherkin Scenario 2)
 * AT-SOC9-B-5: POST /social/posts/:id/reactions → 201 created
 * AT-SOC9-B-6: DELETE /social/posts/:id/reactions/:type → 204
 * AT-SOC9-B-7: POST /social/posts/:id/comments → 400 PII_DETECTED_IN_COMMENT
 * AT-SOC9-B-8: POST /social/posts/:id/comments → 201 created
 * AT-SOC9-A-7: DELETE /social/posts/:id → 403 si no es el autor ni admin
 * AT-SOC9-A-8: DELETE /social/posts/:id → 204 si es el autor
 */

vi.mock('../services/db', () => ({
  default: { execute: vi.fn(), query: vi.fn(), getConnection: vi.fn() },
}));
vi.mock('../services/fleetService', () => ({
  default: {
    getUserOwnerIds: vi.fn().mockResolvedValue([5]),
    getAllUnits: vi.fn().mockResolvedValue([]),
    getUnitById: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn(() => Promise.resolve('hashed_pw')),
  verify: vi.fn(() => Promise.resolve(true)),
}));
vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc(${v})`),
    decrypt: vi.fn((v: string) => v.replace(/^enc\((.+)\)$/, '$1')),
    generateBlindIndex: vi.fn((v: string) => `SVR-${v.substring(0, 16).toUpperCase()}`),
  },
}));

const MOCK_POST = {
  id: 1,
  author_id: 2,
  owner_id: 5,
  content_text: 'Taller completó inspección de flota satisfactoriamente.',
  image_urls_json: null,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
};

describe('GET|POST|DELETE /v1/social/posts — FC-9 SocialNetwork FaseA', () => {
  const app = buildApp();
  let adminToken: string;
  let userToken: string;
  let otherToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    adminToken = jwt.sign({ id: 1, username: 'archon', roleId: 0, permissions: ['*'] });
    userToken = jwt.sign({ id: 2, username: 'taller.op', roleId: 3, permissions: ['social:post'] });
    otherToken = jwt.sign({ id: 9, username: 'outsider', roleId: 3, permissions: ['social:post'] });
  });

  beforeEach(() => vi.clearAllMocks());

  it('AT-SOC9-A-1: GET /social/posts → 401 sin JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/social/posts' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-SOC9-A-2: GET /social/posts → 200 lista de posts', async () => {
    (db.execute as any).mockResolvedValueOnce([[MOCK_POST]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/social/posts',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body.posts)).toBe(true);
    expect(body.posts[0].contentText).toBe(MOCK_POST.content_text);
  });

  it('AT-SOC9-A-3: GET /social/posts?authorId=2 → 200 filtrado', async () => {
    (db.execute as any).mockResolvedValueOnce([[MOCK_POST]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/social/posts?authorId=2',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).posts.length).toBe(1);
  });

  it('AT-SOC9-A-4: POST /social/posts → 400 MISSING_REQUIRED_FIELDS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/posts',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('MISSING_REQUIRED_FIELDS');
  });

  it('AT-SOC9-A-5: POST /social/posts → 400 PII_DETECTED_IN_POST (Gherkin Scenario 1)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/posts',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ contentText: 'Revisamos la unidad XYZ-1234 hoy.' }),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('PII_DETECTED_IN_POST');
  });

  it('AT-SOC9-A-6: POST /social/posts → 201 created', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ owner_id: 5 }]])
      .mockResolvedValueOnce([{ insertId: 42 }]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/posts',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({
        contentText: 'Taller completó una inspección de flota. Resultados sobresalientes.',
      }),
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).id).toBe(42);
  });

  it('AT-SOC9-A-7: DELETE /social/posts/:id → 403 si no es el autor ni admin', async () => {
    (db.execute as any).mockResolvedValueOnce([[{ id: 1, author_id: 2 }]]);
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/social/posts/1',
      headers: { authorization: `Bearer ${otherToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).error).toBe('FORBIDDEN');
  });

  it('AT-SOC9-A-8: DELETE /social/posts/:id → 204 si es el autor', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, author_id: 2 }]])
      .mockResolvedValueOnce([{}]);
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/social/posts/1',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(204);
  });

  // ── FaseB: Reactions + Comments ────────────────────────────────────────────

  it('AT-SOC9-B-1: POST /social/posts/1/reactions → 401 sin JWT', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/posts/1/reactions',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ type: 'VELOZ' }),
    });
    expect(res.statusCode).toBe(401);
  });

  it('AT-SOC9-B-2: POST /social/posts/1/reactions → 400 INVALID_REACTION_TYPE', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/posts/1/reactions',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ type: 'INVALIDO' }),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('INVALID_REACTION_TYPE');
  });

  it('AT-SOC9-B-3: POST /social/posts/99/reactions → 404 POST_NOT_FOUND', async () => {
    (db.execute as any).mockResolvedValueOnce([[]]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/posts/99/reactions',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ type: 'VELOZ' }),
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).error).toBe('POST_NOT_FOUND');
  });

  it('AT-SOC9-B-4: POST /social/posts/1/reactions → 409 REACTION_ALREADY_EXISTS (Gherkin Scenario 2)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([{ affectedRows: 0, insertId: 0 }]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/posts/1/reactions',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ type: 'VELOZ' }),
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.payload).error).toBe('REACTION_ALREADY_EXISTS');
  });

  it('AT-SOC9-B-5: POST /social/posts/1/reactions → 201 created', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([{ affectedRows: 1, insertId: 7 }]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/posts/1/reactions',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ type: 'IMPECABLE' }),
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).id).toBe(7);
  });

  it('AT-SOC9-B-6: DELETE /social/posts/1/reactions/VELOZ → 204', async () => {
    (db.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/social/posts/1/reactions/VELOZ',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it('AT-SOC9-B-7: POST /social/posts/1/comments → 400 PII_DETECTED_IN_COMMENT', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/posts/1/comments',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ contentText: 'El camion ABC-1234 ya fue reparado.' }),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('PII_DETECTED_IN_COMMENT');
  });

  it('AT-SOC9-B-8: POST /social/posts/1/comments → 201 created', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([{ insertId: 12 }]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/posts/1/comments',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ contentText: 'Excelente trabajo en la inspección de hoy.' }),
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).id).toBe(12);
  });
});
