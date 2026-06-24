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

// Server-side PII sanitizer — AG decision: no is_sanitized column, 100% server-side
const PLATE_REGEX = /\b[A-Z]{2,3}[-\s]?\d{3,4}[-\s]?[A-Z]{0,2}\b/i;
const VIN_REGEX = /\b[A-HJ-NPR-Z0-9]{17}\b/;

function containsPII(text: string): boolean {
  return PLATE_REGEX.test(text) || VIN_REGEX.test(text);
}

type InteractionType = 'CALL' | 'EMAIL' | 'NOTE' | 'MEETING';

interface InteractionRow {
  id: number;
  owner_id: number;
  contact_id: number | null;
  type: InteractionType;
  summary: string;
  created_by: number;
  created_at: string;
}

function formatInteraction(row: InteractionRow): object {
  return {
    id: row.id,
    ownerId: row.owner_id,
    contactId: row.contact_id,
    type: row.type,
    summary: row.summary,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

interface InteractionBody {
  ownerId?: number;
  contactId?: number | null;
  type?: InteractionType;
  summary?: string;
}

interface InteractionQuery {
  from?: string;
  to?: string;
}

export default async function crmInteractionsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: InteractionQuery }>('/crm/interactions', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const { from, to } = request.query;

    try {
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      if (from) {
        conditions.push('created_at >= ?');
        params.push(from);
      }
      if (to) {
        conditions.push('created_at <= ?');
        params.push(to);
      }

      let ownerCondition = '';
      if (!hasAdminAccess(caller.permissions)) {
        const ownerIds = await getCallerOwnerIds(caller.id);
        if (ownerIds.length === 0) return reply.send({ interactions: [] });
        const ph = ownerIds.map(() => '?').join(',');
        ownerCondition = `owner_id IN (${ph})`;
        params.unshift(...ownerIds);
      }

      if (ownerCondition) conditions.unshift(ownerCondition);
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT * FROM crm_interactions ${where} ORDER BY created_at DESC`,
        params
      );

      return reply.send({
        interactions: rows.map((r) => formatInteraction(r as InteractionRow)),
      });
    } catch {
      return reply.code(500).send({ error: 'INTERACTIONS_FETCH_FAIL' });
    }
  });

  fastify.post<{ Body: InteractionBody }>('/crm/interactions', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const { ownerId, contactId, type, summary } = request.body ?? {};

    if (!ownerId || !summary) {
      return reply.code(400).send({ error: 'MISSING_REQUIRED_FIELDS' });
    }

    // Server-side PII sanitizer — blocks placas/NS in free text
    if (containsPII(summary)) {
      return reply.code(400).send({ error: 'PII_DETECTED_IN_SUMMARY' });
    }

    if (!hasAdminAccess(caller.permissions)) {
      const ownerIds = await getCallerOwnerIds(caller.id);
      if (!ownerIds.includes(ownerId)) {
        return reply.code(403).send({ error: 'FORBIDDEN' });
      }
    }

    try {
      const [result] = await db.execute<ResultSetHeader>(
        `INSERT INTO crm_interactions (owner_id, contact_id, type, summary, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [ownerId, contactId ?? null, type ?? 'NOTE', summary, caller.id]
      );
      return reply.code(201).send({ id: result.insertId });
    } catch {
      return reply.code(500).send({ error: 'INTERACTIONS_CREATE_FAIL' });
    }
  });
}
