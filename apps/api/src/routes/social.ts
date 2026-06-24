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
}
