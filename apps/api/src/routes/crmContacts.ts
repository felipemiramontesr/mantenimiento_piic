import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../services/db';
import EncryptionService from '../services/encryption';

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

interface ContactRow {
  id: number;
  owner_id: number;
  full_name: string;
  company: string | null;
  role_label: string | null;
  email: string | null;
  email_bi: string | null;
  phone: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function decryptContact(row: ContactRow): object {
  return {
    id: row.id,
    ownerId: row.owner_id,
    fullName: row.full_name,
    company: row.company,
    roleLabel: row.role_label,
    email: row.email ? EncryptionService.decrypt(row.email) : null,
    phone: row.phone ? EncryptionService.decrypt(row.phone) : null,
    notes: row.notes,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface ContactBody {
  ownerId?: number;
  fullName?: string;
  company?: string | null;
  roleLabel?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

function buildPatchClauses(body: ContactBody): {
  setClauses: string[];
  params: (string | number | null)[];
} {
  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if (body.fullName !== undefined) {
    setClauses.push('full_name = ?');
    params.push(body.fullName.trim());
  }
  if (body.company !== undefined) {
    setClauses.push('company = ?');
    params.push(body.company);
  }
  if (body.roleLabel !== undefined) {
    setClauses.push('role_label = ?');
    params.push(body.roleLabel);
  }
  if (body.notes !== undefined) {
    setClauses.push('notes = ?');
    params.push(body.notes);
  }
  if (body.isActive !== undefined) {
    setClauses.push('is_active = ?');
    params.push(body.isActive ? 1 : 0);
  }
  if (body.email !== undefined) {
    setClauses.push('email = ?', 'email_bi = ?');
    params.push(
      body.email ? EncryptionService.encrypt(body.email) : null,
      body.email ? EncryptionService.generateBlindIndex(body.email) : null
    );
  }
  if (body.phone !== undefined) {
    setClauses.push('phone = ?');
    params.push(body.phone ? EncryptionService.encrypt(body.phone) : null);
  }

  return { setClauses, params };
}

export default async function crmContactsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /v1/contacts
   * EAL6+: admin sees all; scoped users see contacts belonging to their owner(s).
   */
  fastify.get('/contacts', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };

    try {
      let rows: RowDataPacket[];

      if (hasAdminAccess(caller.permissions)) {
        [rows] = await db.execute<RowDataPacket[]>('SELECT * FROM crm_contacts ORDER BY full_name');
      } else {
        const ownerIds = await getCallerOwnerIds(caller.id);
        if (ownerIds.length === 0) return reply.send({ contacts: [] });
        const placeholders = ownerIds.map(() => '?').join(',');
        [rows] = await db.execute<RowDataPacket[]>(
          `SELECT * FROM crm_contacts WHERE owner_id IN (${placeholders}) ORDER BY full_name`,
          ownerIds
        );
      }

      return reply.send({ contacts: rows.map((r) => decryptContact(r as ContactRow)) });
    } catch {
      return reply.code(500).send({ error: 'CONTACTS_FETCH_FAIL' });
    }
  });

  /**
   * GET /v1/contacts/:id
   */
  fastify.get<{ Params: { id: string } }>('/contacts/:id', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const contactId = Number(request.params.id);

    if (Number.isNaN(contactId)) return reply.code(400).send({ error: 'Invalid id' });

    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT * FROM crm_contacts WHERE id = ? LIMIT 1',
        [contactId]
      );

      if (rows.length === 0) return reply.code(404).send({ error: 'Not found' });

      const row = rows[0] as ContactRow;

      if (!hasAdminAccess(caller.permissions)) {
        const ownerIds = await getCallerOwnerIds(caller.id);
        if (!ownerIds.includes(row.owner_id)) {
          return reply.code(403).send({ error: 'Access denied' });
        }
      }

      return reply.send({ contact: decryptContact(row) });
    } catch {
      return reply.code(500).send({ error: 'CONTACT_FETCH_FAIL' });
    }
  });

  /**
   * POST /v1/contacts
   */
  fastify.post<{ Body: ContactBody }>('/contacts', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const { ownerId, fullName, company, roleLabel, email, phone, notes } = request.body ?? {};

    if (!ownerId || !fullName || fullName.trim() === '') {
      return reply.code(400).send({ error: 'ownerId and fullName are required' });
    }

    if (!hasAdminAccess(caller.permissions)) {
      const ownerIds = await getCallerOwnerIds(caller.id);
      if (!ownerIds.includes(ownerId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }
    }

    try {
      const encEmail = email ? EncryptionService.encrypt(email) : null;
      const emailBi = email ? EncryptionService.generateBlindIndex(email) : null;
      const encPhone = phone ? EncryptionService.encrypt(phone) : null;

      const [result] = await db.execute<ResultSetHeader>(
        `INSERT INTO crm_contacts (owner_id, full_name, company, role_label, email, email_bi, phone, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ownerId,
          fullName.trim(),
          company ?? null,
          roleLabel ?? null,
          encEmail,
          emailBi,
          encPhone,
          notes ?? null,
        ]
      );

      return reply.code(201).send({ id: result.insertId });
    } catch {
      return reply.code(500).send({ error: 'CONTACT_CREATE_FAIL' });
    }
  });

  /**
   * PATCH /v1/contacts/:id
   */
  fastify.patch<{ Params: { id: string }; Body: ContactBody }>(
    '/contacts/:id',
    async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: 'Session required' });
      }

      const caller = request.user as { id: number; permissions: string[] };
      const contactId = Number(request.params.id);
      if (Number.isNaN(contactId)) return reply.code(400).send({ error: 'Invalid id' });

      const body = request.body ?? {};

      try {
        const [rows] = await db.execute<RowDataPacket[]>(
          'SELECT owner_id FROM crm_contacts WHERE id = ? LIMIT 1',
          [contactId]
        );

        if (rows.length === 0) return reply.code(404).send({ error: 'Not found' });

        const row = rows[0] as { owner_id: number };

        if (!hasAdminAccess(caller.permissions)) {
          const ownerIds = await getCallerOwnerIds(caller.id);
          if (!ownerIds.includes(row.owner_id)) {
            return reply.code(403).send({ error: 'Access denied' });
          }
        }

        const { setClauses, params } = buildPatchClauses(body);

        if (setClauses.length === 0) return reply.code(400).send({ error: 'No fields to update' });

        params.push(contactId);

        await db.execute<ResultSetHeader>(
          `UPDATE crm_contacts SET ${setClauses.join(', ')} WHERE id = ?`,
          params
        );

        return reply.send({ success: true });
      } catch {
        return reply.code(500).send({ error: 'CONTACT_UPDATE_FAIL' });
      }
    }
  );

  /**
   * DELETE /v1/contacts/:id
   */
  fastify.delete<{ Params: { id: string } }>('/contacts/:id', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const contactId = Number(request.params.id);
    if (Number.isNaN(contactId)) return reply.code(400).send({ error: 'Invalid id' });

    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT owner_id FROM crm_contacts WHERE id = ? LIMIT 1',
        [contactId]
      );

      if (rows.length === 0) return reply.code(404).send({ error: 'Not found' });

      const row = rows[0] as { owner_id: number };

      if (!hasAdminAccess(caller.permissions)) {
        const ownerIds = await getCallerOwnerIds(caller.id);
        if (!ownerIds.includes(row.owner_id)) {
          return reply.code(403).send({ error: 'Access denied' });
        }
      }

      await db.execute<ResultSetHeader>('DELETE FROM crm_contacts WHERE id = ?', [contactId]);

      return reply.send({ success: true });
    } catch {
      return reply.code(500).send({ error: 'CONTACT_DELETE_FAIL' });
    }
  });
}
