import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../services/db';

async function getCallerOwnerIds(userId: number): Promise<number[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT owner_id FROM user_owner_membership WHERE user_id = ?',
    [userId]
  );
  return rows.map((r) => r.owner_id as number);
}

function hasAdminAccess(permissions: string[]): boolean {
  return permissions.includes('*') || permissions.includes('user:admin');
}

// Server-side PII sanitizer — same invariant as FC-8 FaseC/E
const PLATE_REGEX = /\b[A-Z]{2,3}[-\s]?\d{3,4}[-\s]?[A-Z]{0,2}\b/i;
const VIN_REGEX = /\b[A-HJ-NPR-Z0-9]{17}\b/;

function containsPII(text: string): boolean {
  return PLATE_REGEX.test(text) || VIN_REGEX.test(text);
}

interface PostRow {
  id: number;
  author_id: number;
  owner_id: number;
  content_text: string;
  image_urls_json: string | null;
  created_at: string;
  updated_at: string;
}

function formatPost(row: PostRow): object {
  return {
    id: row.id,
    authorId: row.author_id,
    ownerId: row.owner_id,
    contentText: row.content_text,
    imageUrls: row.image_urls_json ? (JSON.parse(row.image_urls_json) as string[]) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface PostBody {
  contentText?: string;
  imageUrls?: string[];
}

interface PostQuery {
  authorId?: string;
  limit?: string;
}

type ReactionType = 'IMPECABLE' | 'VELOZ' | 'TRANSPARENTE' | 'UTIL';
const VALID_REACTIONS: readonly ReactionType[] = ['IMPECABLE', 'VELOZ', 'TRANSPARENTE', 'UTIL'];

interface ReactionBody {
  type?: string;
}

interface CommentBody {
  contentText?: string;
  parentCommentId?: number;
}

interface ReviewBody {
  tallerOwnerId?: number;
  rating?: number;
  bodyText?: string;
  workOrderId?: number;
  linkId?: number;
}

interface ReviewQuery {
  tallerId?: string;
}

interface DirectoryQuery {
  q?: string;
  specialties?: string;
  minRating?: string;
}

export default async function socialRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: PostQuery }>('/social/posts', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const { authorId, limit } = request.query;
    const maxRows = Math.min(Number(limit ?? 50), 100);

    try {
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      if (authorId) {
        conditions.push('author_id = ?');
        params.push(Number(authorId));
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      params.push(maxRows);

      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT * FROM social_posts ${where} ORDER BY created_at DESC LIMIT ?`,
        params
      );

      return reply.send({ posts: rows.map((r) => formatPost(r as PostRow)) });
    } catch {
      return reply.code(500).send({ error: 'POSTS_FETCH_FAIL' });
    }
  });

  fastify.post<{ Body: PostBody }>('/social/posts', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const { contentText, imageUrls } = request.body ?? {};

    if (!contentText) {
      return reply.code(400).send({ error: 'MISSING_REQUIRED_FIELDS' });
    }

    if (containsPII(contentText)) {
      return reply.code(400).send({ error: 'PII_DETECTED_IN_POST' });
    }

    try {
      const ownerIds = await getCallerOwnerIds(caller.id);
      const ownerId = ownerIds[0] ?? 1;

      const imageJson = imageUrls && imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;

      const [result] = await db.execute<ResultSetHeader>(
        `INSERT INTO social_posts (author_id, owner_id, content_text, image_urls_json)
         VALUES (?, ?, ?, ?)`,
        [caller.id, ownerId, contentText, imageJson]
      );

      return reply.code(201).send({ id: result.insertId });
    } catch {
      return reply.code(500).send({ error: 'POST_CREATE_FAIL' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/social/posts/:id', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const postId = Number(request.params.id);

    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT id, author_id FROM social_posts WHERE id = ?',
        [postId]
      );

      if (rows.length === 0) return reply.code(404).send({ error: 'POST_NOT_FOUND' });

      const post = rows[0] as { id: number; author_id: number };

      if (!hasAdminAccess(caller.permissions) && post.author_id !== caller.id) {
        return reply.code(403).send({ error: 'FORBIDDEN' });
      }

      await db.execute('DELETE FROM social_posts WHERE id = ?', [postId]);
      return reply.code(204).send();
    } catch {
      return reply.code(500).send({ error: 'POST_DELETE_FAIL' });
    }
  });

  // ── Reactions ──────────────────────────────────────────────────────────────

  fastify.post<{ Params: { id: string }; Body: ReactionBody }>(
    '/social/posts/:id/reactions',
    async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: 'Session required' });
      }

      const caller = request.user as { id: number; permissions: string[] };
      const postId = Number(request.params.id);
      const { type } = request.body ?? {};

      if (!type || !VALID_REACTIONS.includes(type as ReactionType)) {
        return reply.code(400).send({ error: 'INVALID_REACTION_TYPE' });
      }

      try {
        const [posts] = await db.execute<RowDataPacket[]>(
          'SELECT id FROM social_posts WHERE id = ?',
          [postId]
        );
        if (posts.length === 0) return reply.code(404).send({ error: 'POST_NOT_FOUND' });

        const [result] = await db.execute<ResultSetHeader>(
          'INSERT IGNORE INTO social_reactions (post_id, user_id, type) VALUES (?, ?, ?)',
          [postId, caller.id, type]
        );

        if (result.affectedRows === 0) {
          return reply.code(409).send({ error: 'REACTION_ALREADY_EXISTS' });
        }
        return reply.code(201).send({ id: result.insertId });
      } catch {
        return reply.code(500).send({ error: 'REACTION_CREATE_FAIL' });
      }
    }
  );

  fastify.delete<{ Params: { id: string; type: string } }>(
    '/social/posts/:id/reactions/:type',
    async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: 'Session required' });
      }

      const caller = request.user as { id: number; permissions: string[] };
      const postId = Number(request.params.id);
      const { type } = request.params;

      if (!VALID_REACTIONS.includes(type as ReactionType)) {
        return reply.code(400).send({ error: 'INVALID_REACTION_TYPE' });
      }

      try {
        await db.execute(
          'DELETE FROM social_reactions WHERE post_id = ? AND user_id = ? AND type = ?',
          [postId, caller.id, type]
        );
        return reply.code(204).send();
      } catch {
        return reply.code(500).send({ error: 'REACTION_DELETE_FAIL' });
      }
    }
  );

  // ── Comments ───────────────────────────────────────────────────────────────

  fastify.get<{ Params: { id: string } }>('/social/posts/:id/comments', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const postId = Number(request.params.id);

    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT id, post_id, author_id, parent_comment_id, content_text, created_at
           FROM social_comments WHERE post_id = ? ORDER BY created_at ASC`,
        [postId]
      );
      return reply.send({
        comments: rows.map((r) => ({
          id: r.id,
          postId: r.post_id,
          authorId: r.author_id,
          parentCommentId: r.parent_comment_id ?? null,
          contentText: r.content_text,
          createdAt: r.created_at,
        })),
      });
    } catch {
      return reply.code(500).send({ error: 'COMMENTS_FETCH_FAIL' });
    }
  });

  fastify.post<{ Params: { id: string }; Body: CommentBody }>(
    '/social/posts/:id/comments',
    async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: 'Session required' });
      }

      const caller = request.user as { id: number; permissions: string[] };
      const postId = Number(request.params.id);
      const { contentText, parentCommentId } = request.body ?? {};

      if (!contentText) {
        return reply.code(400).send({ error: 'MISSING_REQUIRED_FIELDS' });
      }

      if (containsPII(contentText)) {
        return reply.code(400).send({ error: 'PII_DETECTED_IN_COMMENT' });
      }

      try {
        const [posts] = await db.execute<RowDataPacket[]>(
          'SELECT id FROM social_posts WHERE id = ?',
          [postId]
        );
        if (posts.length === 0) return reply.code(404).send({ error: 'POST_NOT_FOUND' });

        const [result] = await db.execute<ResultSetHeader>(
          `INSERT INTO social_comments (post_id, author_id, parent_comment_id, content_text)
           VALUES (?, ?, ?, ?)`,
          [postId, caller.id, parentCommentId ?? null, contentText]
        );

        return reply.code(201).send({ id: result.insertId });
      } catch {
        return reply.code(500).send({ error: 'COMMENT_CREATE_FAIL' });
      }
    }
  );

  // ── Reviews ────────────────────────────────────────────────────────────────

  fastify.post<{ Body: ReviewBody }>('/social/reviews', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const { tallerOwnerId, rating, bodyText, workOrderId, linkId } = request.body ?? {};

    if (!tallerOwnerId || !rating || !bodyText) {
      return reply.code(400).send({ error: 'MISSING_REQUIRED_FIELDS' });
    }

    if (rating < 1 || rating > 5) {
      return reply.code(400).send({ error: 'INVALID_RATING' });
    }

    try {
      let verified = 0;

      if (workOrderId) {
        const [woRows] = await db.execute<RowDataPacket[]>(
          "SELECT id FROM upa_work_orders WHERE id = ? AND status = 'CLOSED'",
          [workOrderId]
        );
        if (woRows.length > 0) verified = 1;
      }

      if (!verified && linkId) {
        const [linkRows] = await db.execute<RowDataPacket[]>(
          'SELECT id FROM owner_service_links WHERE id = ?',
          [linkId]
        );
        if (linkRows.length > 0) verified = 1;
      }

      if (!verified) {
        return reply.code(403).send({ error: 'NO_VERIFIED_LINK' });
      }

      const [result] = await db.execute<ResultSetHeader>(
        `INSERT INTO social_reviews
           (reviewer_id, taller_owner_id, rating, body_text, work_order_id, link_id, verified)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [caller.id, tallerOwnerId, rating, bodyText, workOrderId ?? null, linkId ?? null, verified]
      );

      return reply.code(201).send({ id: result.insertId, verified });
    } catch (err: unknown) {
      const mysqlErr = err as { code?: string };
      if (mysqlErr.code === 'ER_DUP_ENTRY') {
        return reply.code(409).send({ error: 'REVIEW_ALREADY_EXISTS' });
      }
      return reply.code(500).send({ error: 'REVIEW_CREATE_FAIL' });
    }
  });

  fastify.get<{ Querystring: ReviewQuery }>('/social/reviews', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const { tallerId } = request.query;

    try {
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      if (tallerId) {
        conditions.push('r.taller_owner_id = ?');
        params.push(Number(tallerId));
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT r.id, r.reviewer_id, r.taller_owner_id, r.rating,
                r.body_text, r.work_order_id, r.link_id, r.verified, r.created_at
         FROM social_reviews r ${where} ORDER BY r.created_at DESC`,
        params
      );

      const avgRow = tallerId
        ? await db.execute<RowDataPacket[]>(
            'SELECT AVG(rating) AS avg_rating FROM social_reviews WHERE taller_owner_id = ?',
            [Number(tallerId)]
          )
        : null;

      const avgRating = avgRow
        ? Number(
            ((avgRow as [RowDataPacket[], unknown])[0][0] as { avg_rating: number | null })
              .avg_rating ?? 0
          )
        : null;

      return reply.send({
        reviews: rows.map((r) => ({
          id: r.id,
          reviewerId: r.reviewer_id,
          tallerOwnerId: r.taller_owner_id,
          rating: r.rating,
          bodyText: r.body_text,
          workOrderId: r.work_order_id ?? null,
          linkId: r.link_id ?? null,
          verified: r.verified === 1,
          createdAt: r.created_at,
        })),
        avgRating,
      });
    } catch {
      return reply.code(500).send({ error: 'REVIEWS_FETCH_FAIL' });
    }
  });

  // ── Directory ──────────────────────────────────────────────────────────────

  fastify.get<{ Querystring: DirectoryQuery }>('/social/directory', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const { q, specialties, minRating } = request.query;

    try {
      const whereParts: string[] = [];
      const havingParts: string[] = [];
      const params: (string | number)[] = [];
      const havingParams: number[] = [];

      if (q) {
        whereParts.push('(o.label LIKE ? OR op.razon_social LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
      }
      if (specialties) {
        whereParts.push('op.especialidades LIKE ?');
        params.push(`%${specialties}%`);
      }
      if (minRating) {
        havingParts.push('avg_rating >= ?');
        havingParams.push(Number(minRating));
      }

      const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
      const havingClause = havingParts.length > 0 ? `HAVING ${havingParts.join(' AND ')}` : '';

      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT
           o.id,
           o.label,
           op.razon_social,
           op.especialidades,
           op.telefono,
           op.direccion,
           ROUND(COALESCE(AVG(sr.rating), 0), 2) AS avg_rating,
           COUNT(DISTINCT sr.id) AS review_count
         FROM owners o
         INNER JOIN (
           SELECT DISTINCT uom.owner_id
           FROM user_owner_membership uom
           JOIN users u ON u.id = uom.user_id AND u.role_id = 3
         ) AS centro_owners ON centro_owners.owner_id = o.id
         LEFT JOIN owner_profiles op ON op.owner_id = o.id
         LEFT JOIN social_reviews sr ON sr.taller_owner_id = o.id
         ${whereClause}
         GROUP BY o.id, o.label, op.razon_social, op.especialidades, op.telefono, op.direccion
         ${havingClause}
         ORDER BY avg_rating DESC`,
        [...params, ...havingParams]
      );

      return reply.send({
        talleres: rows.map((r) => ({
          id: r.id,
          label: r.label,
          razonSocial: r.razon_social ?? null,
          especialidades: r.especialidades ?? null,
          telefono: r.telefono ?? null,
          direccion: r.direccion ?? null,
          avgRating: Number(r.avg_rating),
          reviewCount: Number(r.review_count),
        })),
      });
    } catch {
      return reply.code(500).send({ error: 'DIRECTORY_FETCH_FAIL' });
    }
  });
}
