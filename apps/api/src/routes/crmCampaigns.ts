import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
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

// Server-side PII sanitizer — same invariant as FaseC (AG decision, no is_sanitized column)
const PLATE_REGEX = /\b[A-Z]{2,3}[-\s]?\d{3,4}[-\s]?[A-Z]{0,2}\b/i;
const VIN_REGEX = /\b[A-HJ-NPR-Z0-9]{17}\b/;

function containsPII(text: string): boolean {
  return PLATE_REGEX.test(text) || VIN_REGEX.test(text);
}

type CampaignType = 'CONTRACT_EXPIRY' | 'MAINTENANCE_REMINDER' | 'QUOTATION';
const VALID_TYPES: readonly CampaignType[] = [
  'CONTRACT_EXPIRY',
  'MAINTENANCE_REMINDER',
  'QUOTATION',
];

interface CampaignRow {
  id: number;
  owner_id: number;
  name: string;
  subject: string;
  body_text: string;
  type: CampaignType;
  created_by: number;
  created_at: string;
  updated_at: string;
}

function formatCampaign(row: CampaignRow): object {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    subject: row.subject,
    bodyText: row.body_text,
    type: row.type,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface CampaignBody {
  ownerId?: number;
  name?: string;
  subject?: string;
  bodyText?: string;
  type?: CampaignType;
}

export default async function crmCampaignsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/crm/campaigns', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };

    try {
      if (hasAdminAccess(caller.permissions)) {
        const [rows] = await db.execute<RowDataPacket[]>(
          'SELECT * FROM campaign_templates ORDER BY created_at DESC'
        );
        return reply.send({ campaigns: rows.map((r) => formatCampaign(r as CampaignRow)) });
      }

      const ownerIds = await getCallerOwnerIds(caller.id);
      if (ownerIds.length === 0) return reply.send({ campaigns: [] });

      const ph = ownerIds.map(() => '?').join(',');
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT * FROM campaign_templates WHERE owner_id IN (${ph}) ORDER BY created_at DESC`,
        ownerIds
      );
      return reply.send({ campaigns: rows.map((r) => formatCampaign(r as CampaignRow)) });
    } catch {
      return reply.code(500).send({ error: 'CAMPAIGNS_FETCH_FAIL' });
    }
  });

  fastify.post<{ Body: CampaignBody }>('/crm/campaigns', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const { ownerId, name, subject, bodyText, type } = request.body ?? {};

    if (!ownerId || !name || !subject || !bodyText) {
      return reply.code(400).send({ error: 'MISSING_REQUIRED_FIELDS' });
    }

    if (type && !VALID_TYPES.includes(type)) {
      return reply.code(400).send({ error: 'INVALID_CAMPAIGN_TYPE' });
    }

    // PII sanitizer applied to subject + body_text
    if (containsPII(subject) || containsPII(bodyText)) {
      return reply.code(400).send({ error: 'PII_DETECTED_IN_TEMPLATE' });
    }

    if (!hasAdminAccess(caller.permissions)) {
      const ownerIds = await getCallerOwnerIds(caller.id);
      if (!ownerIds.includes(ownerId)) {
        return reply.code(403).send({ error: 'FORBIDDEN' });
      }
    }

    try {
      const [result] = await db.execute<ResultSetHeader>(
        `INSERT INTO campaign_templates (owner_id, name, subject, body_text, type, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ownerId, name, subject, bodyText, type ?? 'MAINTENANCE_REMINDER', caller.id]
      );
      return reply.code(201).send({ id: result.insertId });
    } catch {
      return reply.code(500).send({ error: 'CAMPAIGNS_CREATE_FAIL' });
    }
  });

  fastify.post<{ Params: { id: string } }>('/crm/campaigns/:id/send', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const templateId = Number(request.params.id);

    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT id, owner_id, type FROM campaign_templates WHERE id = ?',
        [templateId]
      );

      if (rows.length === 0) return reply.code(404).send({ error: 'CAMPAIGN_NOT_FOUND' });

      const tpl = rows[0] as { id: number; owner_id: number; type: CampaignType };

      if (!hasAdminAccess(caller.permissions)) {
        const ownerIds = await getCallerOwnerIds(caller.id);
        if (!ownerIds.includes(tpl.owner_id)) {
          return reply.code(403).send({ error: 'FORBIDDEN' });
        }
      }

      // Enqueue to notifications_outbox — async Outbox pattern (no SMTP blocking)
      const sourceUuid = randomUUID();
      const [outboxResult] = await db.execute<ResultSetHeader>(
        `INSERT INTO notifications_outbox (permission_slug, notification_type, source_uuid, user_id)
         VALUES ('crm:campaigns', ?, ?, ?)`,
        [tpl.type, sourceUuid, caller.id]
      );

      return reply.code(201).send({ queued: true, outboxId: outboxResult.insertId });
    } catch {
      return reply.code(500).send({ error: 'CAMPAIGNS_SEND_FAIL' });
    }
  });
}
