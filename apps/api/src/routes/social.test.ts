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
 *
 * FC-9 SocialNetwork_Multiverso FaseC — reviews verificadas
 *
 * AT-SOC9-C-1: POST /social/reviews → 401 sin JWT
 * AT-SOC9-C-2: POST /social/reviews → 400 MISSING_REQUIRED_FIELDS
 * AT-SOC9-C-3: POST /social/reviews → 403 NO_VERIFIED_LINK (Gherkin Scenario 3)
 * AT-SOC9-C-4: POST /social/reviews → 201 verified=1 via work_order CLOSED
 * AT-SOC9-C-5: POST /social/reviews → 201 verified=1 via owner_service_link
 * AT-SOC9-C-6: GET /social/reviews → 401 sin JWT
 * AT-SOC9-C-7: GET /social/reviews?tallerId=X → 200 lista + avg_rating
 * AT-SOC9-C-8: POST /social/reviews → 409 REVIEW_ALREADY_EXISTS (duplicate reviewer+taller)
 *
 * FC-9 SocialNetwork_Multiverso FaseD — directorio de talleres
 *
 * AT-SOC9-D-1: GET /social/directory → 401 sin JWT
 * AT-SOC9-D-2: GET /social/directory → 200 lista de talleres role_id=3
 * AT-SOC9-D-3: GET /social/directory?q=arco → 200 filtrado por nombre
 * AT-SOC9-D-4: GET /social/directory?minRating=4 → 200 filtrado por rating
 * AT-SOC9-D-5: GET /social/directory → orden avg_rating DESC (Gherkin Scenario 4)
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

  it('AT-SOC9-B-11: GET /social/posts/1/comments → 401 sin JWT (lines 261-265)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/social/posts/1/comments' });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('Session required');
  });

  it('AT-SOC9-B-12: GET /social/posts/1/comments → 200 lista de comentarios (lines 260-288)', async () => {
    (db.execute as any).mockResolvedValueOnce([
      [
        {
          id: 1,
          post_id: 1,
          author_id: 5,
          parent_comment_id: null,
          content_text: 'Buen trabajo',
          created_at: '2026-07-01T00:00:00Z',
        },
      ],
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/social/posts/1/comments',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.comments)).toBe(true);
    expect(body.comments[0].contentText).toBe('Buen trabajo');
    expect(body.comments[0].parentCommentId).toBeNull();
  });

  it('AT-SOC9-B-13: GET /social/posts/1/comments → 500 COMMENTS_FETCH_FAIL cuando DB throws (lines 285-287)', async () => {
    (db.execute as any).mockRejectedValueOnce(new Error('DB connection lost'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/social/posts/1/comments',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('COMMENTS_FETCH_FAIL');
  });

  it('AT-SOC9-B-14: POST /social/posts/1/comments → 401 sin JWT (lines 293-297)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/posts/1/comments',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ contentText: 'Test' }),
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('Session required');
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

  it('AT-SOC9-B-9: POST /social/posts/1/comments → 400 MISSING_REQUIRED_FIELDS sin contentText (lines 303-305)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/posts/1/comments',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ parentCommentId: 5 }),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('MISSING_REQUIRED_FIELDS');
  });

  it('AT-SOC9-B-10: POST /social/posts/1/comments → 500 COMMENT_CREATE_FAIL cuando INSERT falla (lines 325-327)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1 }]]) // SELECT post → found
      .mockRejectedValueOnce(new Error('DB connection lost')); // INSERT throws
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/posts/1/comments',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ contentText: 'Comentario de prueba de error.' }),
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).error).toBe('COMMENT_CREATE_FAIL');
  });

  // ── FaseC: Reviews verificadas ─────────────────────────────────────────────

  it('AT-SOC9-C-1: POST /social/reviews → 401 sin JWT', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/reviews',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        tallerOwnerId: 3,
        rating: 5,
        bodyText: 'Excelente.',
        workOrderId: 1,
      }),
    });
    expect(res.statusCode).toBe(401);
  });

  it('AT-SOC9-C-2: POST /social/reviews → 400 MISSING_REQUIRED_FIELDS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/reviews',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ tallerOwnerId: 3 }),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('MISSING_REQUIRED_FIELDS');
  });

  it('AT-SOC9-C-3: POST /social/reviews → 403 NO_VERIFIED_LINK (Gherkin Scenario 3)', async () => {
    // workOrderId not CLOSED, no linkId → guard rejects
    (db.execute as any).mockResolvedValueOnce([[]]); // work_order query returns empty
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/reviews',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({
        tallerOwnerId: 3,
        rating: 5,
        bodyText: 'Sin link.',
        workOrderId: 99,
      }),
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).error).toBe('NO_VERIFIED_LINK');
  });

  it('AT-SOC9-C-4: POST /social/reviews → 201 verified=1 via work_order CLOSED', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1 }]]) // work_order CLOSED found
      .mockResolvedValueOnce([{ insertId: 33 }]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/reviews',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({
        tallerOwnerId: 3,
        rating: 5,
        bodyText: 'Trabajo impecable.',
        workOrderId: 1,
      }),
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe(33);
    expect(body.verified).toBe(1);
  });

  it('AT-SOC9-C-5: POST /social/reviews → 201 verified=1 via owner_service_link', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 7 }]]) // link found
      .mockResolvedValueOnce([{ insertId: 34 }]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/reviews',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({
        tallerOwnerId: 3,
        rating: 4,
        bodyText: 'Muy profesional.',
        linkId: 7,
      }),
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).verified).toBe(1);
  });

  it('AT-SOC9-C-6: GET /social/reviews → 401 sin JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/social/reviews' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-SOC9-C-7: GET /social/reviews?tallerId=3 → 200 lista + avg_rating', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            reviewer_id: 2,
            taller_owner_id: 3,
            rating: 5,
            body_text: 'Top.',
            work_order_id: null,
            link_id: 7,
            verified: 1,
            created_at: '2026-06-20T10:00:00Z',
          },
        ],
      ])
      .mockResolvedValueOnce([[{ avg_rating: 5.0 }]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/social/reviews?tallerId=3',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].verified).toBe(true);
    expect(body.avgRating).toBe(5);
  });

  it('AT-SOC9-C-8: POST /social/reviews → 409 REVIEW_ALREADY_EXISTS', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1 }]]) // work_order CLOSED
      .mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/reviews',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({
        tallerOwnerId: 3,
        rating: 5,
        bodyText: 'Duplicado.',
        workOrderId: 1,
      }),
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.payload).error).toBe('REVIEW_ALREADY_EXISTS');
  });

  it('AT-SOC9-C-11: POST /social/reviews → 400 INVALID_RATING cuando rating fuera de rango (line 347-348)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/reviews',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ tallerOwnerId: 3, rating: 6, bodyText: 'Excelente.' }),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('INVALID_RATING');
  });

  it('AT-SOC9-C-12: POST /social/reviews → 500 REVIEW_CREATE_FAIL cuando INSERT falla con error no-duplicado (line 387)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1 }]]) // work_order CLOSED → verified=1
      .mockRejectedValueOnce(new Error('DB connection lost')); // INSERT throws non-dup error
    const res = await app.inject({
      method: 'POST',
      url: '/v1/social/reviews',
      headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({
        tallerOwnerId: 3,
        rating: 5,
        bodyText: 'Error test.',
        workOrderId: 1,
      }),
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).error).toBe('REVIEW_CREATE_FAIL');
  });

  it('AT-SOC9-C-9: GET /social/reviews (sin tallerId) → avgRating=null', async () => {
    // tallerId absent → avgRow=null → avgRating=null (cubre línea 430 de social.ts)
    (db.execute as any).mockResolvedValueOnce([[]]); // rows vacíos, sin segunda query de avg
    const res = await app.inject({
      method: 'GET',
      url: '/v1/social/reviews',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.reviews).toHaveLength(0);
    expect(body.avgRating).toBeNull();
  });

  it('AT-SOC9-C-10: GET /social/reviews → 500 REVIEWS_FETCH_FAIL por error de DB', async () => {
    (db.execute as any).mockRejectedValueOnce(new Error('DB error'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/social/reviews',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).error).toBe('REVIEWS_FETCH_FAIL');
  });

  // ── FaseD: Directorio de Talleres ──────────────────────────────────────────

  const MOCK_TALLERES = [
    {
      id: 3,
      label: 'Arco Servicios',
      razon_social: 'Arco SA',
      especialidades: 'Frenos,Motor',
      telefono: '555-0001',
      direccion: 'Av. Principal 1',
      avg_rating: '4.8',
      review_count: '10',
    },
    {
      id: 7,
      label: 'Taller Norte',
      razon_social: null,
      especialidades: null,
      telefono: null,
      direccion: null,
      avg_rating: '3.2',
      review_count: '5',
    },
  ];

  it('AT-SOC9-D-1: GET /social/directory → 401 sin JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/social/directory' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-SOC9-D-2: GET /social/directory → 200 lista de talleres', async () => {
    (db.execute as any).mockResolvedValueOnce([MOCK_TALLERES]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/social/directory',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.talleres).toHaveLength(2);
    expect(body.talleres[0].id).toBe(3);
    expect(body.talleres[0].avgRating).toBe(4.8);
  });

  it('AT-SOC9-D-3: GET /social/directory?q=arco → 200 filtrado por nombre', async () => {
    (db.execute as any).mockResolvedValueOnce([[MOCK_TALLERES[0]]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/social/directory?q=arco',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.talleres).toHaveLength(1);
    expect(body.talleres[0].label).toBe('Arco Servicios');
  });

  it('AT-SOC9-D-4: GET /social/directory?minRating=4 → 200 filtrado', async () => {
    (db.execute as any).mockResolvedValueOnce([[MOCK_TALLERES[0]]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/social/directory?minRating=4',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.talleres).toHaveLength(1);
    expect(body.talleres[0].avgRating).toBeGreaterThanOrEqual(4);
  });

  it('AT-SOC9-D-5: GET /social/directory → orden avg_rating DESC (Gherkin Scenario 4)', async () => {
    const talleres = [
      { ...MOCK_TALLERES[0], avg_rating: '4.8', review_count: '3' },
      {
        id: 9,
        label: 'Taller Sur',
        razon_social: null,
        especialidades: null,
        telefono: null,
        direccion: null,
        avg_rating: '4.1',
        review_count: '2',
      },
      { ...MOCK_TALLERES[1], avg_rating: '3.2', review_count: '1' },
    ];
    (db.execute as any).mockResolvedValueOnce([talleres]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/social/directory',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.talleres[0].avgRating).toBe(4.8);
    expect(body.talleres[1].avgRating).toBe(4.1);
    expect(body.talleres[2].avgRating).toBe(3.2);
  });

  it('AT-SOC9-D-6: GET /social/directory?specialties=Motor → 200 filtrado por especialidad', async () => {
    (db.execute as any).mockResolvedValueOnce([[MOCK_TALLERES[0]]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/social/directory?specialties=Motor',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.talleres).toHaveLength(1);
    expect(body.talleres[0].especialidades).toBe('Frenos,Motor');
  });

  it('AT-SOC9-D-7: error DB → 500 DIRECTORY_FETCH_FAIL', async () => {
    (db.execute as any).mockRejectedValueOnce(new Error('DB error'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/social/directory',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).error).toBe('DIRECTORY_FETCH_FAIL');
  });
});
