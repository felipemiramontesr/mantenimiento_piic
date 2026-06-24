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

interface ContractRow {
  id: number;
  owner_id: number;
  unit_id: string | null;
  title: string;
  start_date: string;
  end_date: string;
  sla_hours: number;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

function formatContract(row: ContractRow): object {
  return {
    id: row.id,
    ownerId: row.owner_id,
    unitId: row.unit_id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    slaHours: row.sla_hours,
    status: row.status,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface ContractBody {
  ownerId?: number;
  unitId?: string | null;
  title?: string;
  startDate?: string;
  endDate?: string;
  slaHours?: number;
  status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  notes?: string | null;
}

export default async function crmContractsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/crm/contracts', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };

    try {
      let rows: RowDataPacket[];

      if (hasAdminAccess(caller.permissions)) {
        [rows] = await db.execute<RowDataPacket[]>(
          'SELECT * FROM crm_contracts ORDER BY created_at DESC'
        );
      } else {
        const ownerIds = await getCallerOwnerIds(caller.id);
        if (ownerIds.length === 0) return reply.send({ contracts: [] });
        const placeholders = ownerIds.map(() => '?').join(',');
        [rows] = await db.execute<RowDataPacket[]>(
          `SELECT * FROM crm_contracts WHERE owner_id IN (${placeholders}) ORDER BY created_at DESC`,
          ownerIds
        );
      }

      return reply.send({ contracts: rows.map((r) => formatContract(r as ContractRow)) });
    } catch {
      return reply.code(500).send({ error: 'CONTRACTS_FETCH_FAIL' });
    }
  });

  fastify.post<{ Body: ContractBody }>('/crm/contracts', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const { ownerId, unitId, title, startDate, endDate, slaHours, status, notes } =
      request.body ?? {};

    if (!ownerId || !title || !startDate || !endDate) {
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
        `INSERT INTO crm_contracts
           (owner_id, unit_id, title, start_date, end_date, sla_hours, status, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ownerId,
          unitId ?? null,
          title,
          startDate,
          endDate,
          slaHours ?? 24,
          status ?? 'DRAFT',
          notes ?? null,
          caller.id,
        ]
      );
      return reply.code(201).send({ id: result.insertId });
    } catch {
      return reply.code(500).send({ error: 'CONTRACTS_CREATE_FAIL' });
    }
  });

  fastify.patch<{ Params: { id: string }; Body: ContractBody }>(
    '/crm/contracts/:id',
    async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: 'Session required' });
      }

      const caller = request.user as { id: number; permissions: string[] };
      const contractId = Number(request.params.id);
      if (Number.isNaN(contractId)) return reply.code(400).send({ error: 'Invalid id' });

      try {
        const [rows] = await db.execute<RowDataPacket[]>(
          'SELECT id, owner_id FROM crm_contracts WHERE id = ? LIMIT 1',
          [contractId]
        );
        if (rows.length === 0) return reply.code(404).send({ error: 'Not found' });

        if (!hasAdminAccess(caller.permissions)) {
          const ownerIds = await getCallerOwnerIds(caller.id);
          if (!ownerIds.includes(rows[0].owner_id as number)) {
            return reply.code(403).send({ error: 'FORBIDDEN' });
          }
        }

        const setClauses: string[] = [];
        const params: (string | number | null)[] = [];
        const body = request.body ?? {};

        if (body.title !== undefined) {
          setClauses.push('title = ?');
          params.push(body.title);
        }
        if (body.status !== undefined) {
          setClauses.push('status = ?');
          params.push(body.status);
        }
        if (body.endDate !== undefined) {
          setClauses.push('end_date = ?');
          params.push(body.endDate);
        }
        if (body.slaHours !== undefined) {
          setClauses.push('sla_hours = ?');
          params.push(body.slaHours);
        }
        if (body.notes !== undefined) {
          setClauses.push('notes = ?');
          params.push(body.notes ?? null);
        }

        if (setClauses.length === 0) return reply.code(400).send({ error: 'NO_FIELDS' });

        params.push(contractId);
        await db.execute(`UPDATE crm_contracts SET ${setClauses.join(', ')} WHERE id = ?`, params);
        return reply.send({ ok: true });
      } catch {
        return reply.code(500).send({ error: 'CONTRACTS_UPDATE_FAIL' });
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>('/crm/contracts/:id', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const contractId = Number(request.params.id);
    if (Number.isNaN(contractId)) return reply.code(400).send({ error: 'Invalid id' });

    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT id, owner_id FROM crm_contracts WHERE id = ? LIMIT 1',
        [contractId]
      );
      if (rows.length === 0) return reply.code(404).send({ error: 'Not found' });

      if (!hasAdminAccess(caller.permissions)) {
        const ownerIds = await getCallerOwnerIds(caller.id);
        if (!ownerIds.includes(rows[0].owner_id as number)) {
          return reply.code(403).send({ error: 'FORBIDDEN' });
        }
      }

      await db.execute("UPDATE crm_contracts SET status = 'CANCELLED' WHERE id = ?", [contractId]);
      return reply.code(204).send();
    } catch {
      return reply.code(500).send({ error: 'CONTRACTS_DELETE_FAIL' });
    }
  });
}
