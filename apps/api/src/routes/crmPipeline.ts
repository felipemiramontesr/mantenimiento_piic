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

interface StageRow {
  id: number;
  code: string;
  label: string;
  position: number;
  color: string;
}

interface OpportunityRow {
  id: number;
  owner_id: number;
  stage_id: number;
  title: string;
  value_mxn: string;
  probability_pct: number;
  assigned_to: number | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

function formatOpportunity(row: OpportunityRow): object {
  return {
    id: row.id,
    ownerId: row.owner_id,
    stageId: row.stage_id,
    title: row.title,
    valueMxn: parseFloat(row.value_mxn),
    probabilityPct: row.probability_pct,
    assignedTo: row.assigned_to,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface OpportunityBody {
  ownerId?: number;
  stageId?: number;
  title?: string;
  valueMxn?: number;
  probabilityPct?: number;
  assignedTo?: number | null;
  notes?: string | null;
}

interface StageMoveBody {
  stageCode?: string;
}

export default async function crmPipelineRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/crm/pipeline', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };

    try {
      const [stages] = await db.execute<RowDataPacket[]>(
        'SELECT id, code, label, position, color FROM crm_pipeline_stages ORDER BY position ASC'
      );

      let opportunities: RowDataPacket[];

      if (hasAdminAccess(caller.permissions)) {
        [opportunities] = await db.execute<RowDataPacket[]>(
          'SELECT * FROM crm_opportunities ORDER BY created_at DESC'
        );
      } else {
        const ownerIds = await getCallerOwnerIds(caller.id);
        if (ownerIds.length === 0) {
          return reply.send({
            stages: stages.map((s) => ({ ...(s as StageRow), opportunities: [] })),
          });
        }
        const ph = ownerIds.map(() => '?').join(',');
        [opportunities] = await db.execute<RowDataPacket[]>(
          `SELECT * FROM crm_opportunities WHERE owner_id IN (${ph}) ORDER BY created_at DESC`,
          ownerIds
        );
      }

      const byStage = new Map<number, object[]>();
      opportunities.forEach((opp) => {
        const sid = opp.stage_id as number;
        if (!byStage.has(sid)) byStage.set(sid, []);
        byStage.get(sid)!.push(formatOpportunity(opp as OpportunityRow));
      });

      return reply.send({
        stages: stages.map((s) => ({
          id: s.id,
          code: s.code,
          label: s.label,
          position: s.position,
          color: s.color,
          opportunities: byStage.get(s.id as number) ?? [],
        })),
      });
    } catch {
      return reply.code(500).send({ error: 'PIPELINE_FETCH_FAIL' });
    }
  });

  fastify.post<{ Body: OpportunityBody }>('/crm/pipeline', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const { ownerId, stageId, title, valueMxn, probabilityPct, assignedTo, notes } =
      request.body ?? {};

    if (!ownerId || !title) {
      return reply.code(400).send({ error: 'MISSING_REQUIRED_FIELDS' });
    }

    if (!hasAdminAccess(caller.permissions)) {
      const ownerIds = await getCallerOwnerIds(caller.id);
      if (!ownerIds.includes(ownerId)) {
        return reply.code(403).send({ error: 'FORBIDDEN' });
      }
    }

    try {
      const [result] = await db.execute<ResultSetHeader>(
        `INSERT INTO crm_opportunities
           (owner_id, stage_id, title, value_mxn, probability_pct, assigned_to, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ownerId,
          stageId ?? 1,
          title,
          valueMxn ?? 0,
          probabilityPct ?? 50,
          assignedTo ?? null,
          notes ?? null,
          caller.id,
        ]
      );
      return reply.code(201).send({ id: result.insertId });
    } catch {
      return reply.code(500).send({ error: 'PIPELINE_CREATE_FAIL' });
    }
  });

  fastify.patch<{ Params: { id: string }; Body: StageMoveBody }>(
    '/crm/opportunities/:id/stage',
    async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: 'Session required' });
      }

      const caller = request.user as { id: number; permissions: string[] };
      const oppId = Number(request.params.id);
      if (Number.isNaN(oppId)) return reply.code(400).send({ error: 'Invalid id' });

      const { stageCode } = request.body ?? {};
      if (!stageCode) return reply.code(400).send({ error: 'MISSING_STAGE_CODE' });

      try {
        const [rows] = await db.execute<RowDataPacket[]>(
          'SELECT id, owner_id FROM crm_opportunities WHERE id = ? LIMIT 1',
          [oppId]
        );
        if (rows.length === 0) return reply.code(404).send({ error: 'Not found' });

        if (!hasAdminAccess(caller.permissions)) {
          const ownerIds = await getCallerOwnerIds(caller.id);
          if (!ownerIds.includes(rows[0].owner_id as number)) {
            return reply.code(403).send({ error: 'FORBIDDEN' });
          }
        }

        const [stageRows] = await db.execute<RowDataPacket[]>(
          'SELECT id FROM crm_pipeline_stages WHERE code = ? LIMIT 1',
          [stageCode]
        );
        if (stageRows.length === 0) return reply.code(400).send({ error: 'INVALID_STAGE' });

        await db.execute('UPDATE crm_opportunities SET stage_id = ? WHERE id = ?', [
          stageRows[0].id,
          oppId,
        ]);
        return reply.send({ ok: true });
      } catch {
        return reply.code(500).send({ error: 'PIPELINE_MOVE_FAIL' });
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>('/crm/opportunities/:id', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const oppId = Number(request.params.id);
    if (Number.isNaN(oppId)) return reply.code(400).send({ error: 'Invalid id' });

    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT id, owner_id FROM crm_opportunities WHERE id = ? LIMIT 1',
        [oppId]
      );
      if (rows.length === 0) return reply.code(404).send({ error: 'Not found' });

      if (!hasAdminAccess(caller.permissions)) {
        const ownerIds = await getCallerOwnerIds(caller.id);
        if (!ownerIds.includes(rows[0].owner_id as number)) {
          return reply.code(403).send({ error: 'FORBIDDEN' });
        }
      }

      await db.execute('DELETE FROM crm_opportunities WHERE id = ?', [oppId]);
      return reply.code(204).send();
    } catch {
      return reply.code(500).send({ error: 'PIPELINE_DELETE_FAIL' });
    }
  });
}
