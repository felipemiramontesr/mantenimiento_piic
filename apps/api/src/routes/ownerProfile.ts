import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';
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

const patchSchema = z.object({
  rfc: z.string().max(20).nullable().optional(),
  razonSocial: z.string().max(200).nullable().optional(),
  telefono: z.string().max(20).nullable().optional(),
  especialidades: z.string().max(500).nullable().optional(),
  calle: z.string().max(200).nullable().optional(),
  numeroExt: z.string().max(20).nullable().optional(),
  numeroInt: z.string().max(20).nullable().optional(),
  neighborhoodId: z.number().int().positive().nullable().optional(),
});

type PatchData = z.infer<typeof patchSchema>;

function buildUpdateFields(data: PatchData): {
  fields: string[];
  values: (string | number | null)[];
} {
  const map: Array<[keyof PatchData, string]> = [
    ['rfc', 'rfc'],
    ['razonSocial', 'razon_social'],
    ['telefono', 'telefono'],
    ['especialidades', 'especialidades'],
    ['calle', 'calle'],
    ['numeroExt', 'numero_exterior'],
    ['numeroInt', 'numero_interior'],
    ['neighborhoodId', 'neighborhood_id'],
  ];
  return map.reduce<{ fields: string[]; values: (string | number | null)[] }>(
    (acc, [key, col]) => {
      if (data[key] !== undefined) {
        acc.fields.push(`${col} = ?`);
        acc.values.push(data[key] as string | number | null);
      }
      return acc;
    },
    { fields: [], values: [] }
  );
}

export default async function ownerProfileRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /v1/owners/:ownerId/profile
  fastify.get('/owners/:ownerId/profile', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
    }

    const { ownerId } = request.params as { ownerId: string };
    const caller = request.user as { id: number; permissions: string[] };

    if (!hasAdminAccess(caller.permissions)) {
      const ownerIds = await getCallerOwnerIds(caller.id);
      if (!ownerIds.includes(Number(ownerId))) {
        return reply.code(403).send({ success: false, code: 'FORBIDDEN' });
      }
    }

    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT
           op.id,
           op.owner_id       AS ownerId,
           op.rfc,
           op.razon_social   AS razonSocial,
           op.telefono,
           op.especialidades,
           op.calle,
           op.numero_exterior AS numeroExt,
           op.numero_interior AS numeroInt,
           op.neighborhood_id AS neighborhoodId,
           n.name             AS neighborhoodName,
           n.postal_code      AS postalCode,
           m.id               AS municipalityId,
           m.name             AS municipalityName,
           s.id               AS stateId,
           s.name             AS stateName,
           o.owner_type       AS ownerType
         FROM owner_profiles op
         JOIN owners o ON o.id = op.owner_id
         LEFT JOIN neighborhoods n ON n.id = op.neighborhood_id
         LEFT JOIN municipalities m ON m.id = n.municipality_id
         LEFT JOIN states s ON s.id = m.state_id
         WHERE op.owner_id = ?
         LIMIT 1`,
        [ownerId]
      );

      if (rows.length === 0) {
        return reply.code(404).send({ success: false, code: 'PROFILE_NOT_FOUND' });
      }

      return reply.send({ success: true, data: rows[0] });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ success: false, code: 'PROFILE_FETCH_FAIL' });
    }
  });

  // PATCH /v1/owners/:ownerId/profile
  fastify.patch('/owners/:ownerId/profile', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
    }

    const parsed = patchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ success: false, code: 'VALIDATION_ERROR', details: parsed.error.format() });
    }

    const { ownerId } = request.params as { ownerId: string };
    const caller = request.user as { id: number; permissions: string[] };

    if (!hasAdminAccess(caller.permissions)) {
      const ownerIds = await getCallerOwnerIds(caller.id);
      if (!ownerIds.includes(Number(ownerId))) {
        return reply.code(403).send({ success: false, code: 'FORBIDDEN' });
      }
    }

    try {
      const [profileRows] = await db.execute<RowDataPacket[]>(
        'SELECT op.id, o.owner_type FROM owner_profiles op JOIN owners o ON o.id = op.owner_id WHERE op.owner_id = ? LIMIT 1',
        [ownerId]
      );

      if (profileRows.length === 0) {
        return reply.code(404).send({ success: false, code: 'PROFILE_NOT_FOUND' });
      }

      const { owner_type: ownerType } = profileRows[0];
      const { rfc } = parsed.data;

      if (
        rfc !== undefined &&
        (rfc === null || rfc.trim() === '') &&
        (ownerType === 'FLOTILLA' || ownerType === 'CENTER')
      ) {
        return reply.code(400).send({ success: false, code: 'MISSING_RFC' });
      }

      const { fields, values } = buildUpdateFields(parsed.data);

      if (fields.length === 0) {
        return reply.code(400).send({ success: false, code: 'NO_FIELDS_TO_UPDATE' });
      }

      values.push(ownerId);
      await db.execute<ResultSetHeader>(
        `UPDATE owner_profiles SET ${fields.join(', ')} WHERE owner_id = ?`,
        values
      );

      return reply.send({ success: true });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ success: false, code: 'PROFILE_UPDATE_FAIL' });
    }
  });
}
