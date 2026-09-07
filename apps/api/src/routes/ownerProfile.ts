import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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

async function validateSpecialtyCodes(codes: string[]): Promise<boolean> {
  if (codes.length === 0) return true;
  const placeholders = codes.map(() => '?').join(', ');
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM common_catalogs WHERE category = 'SPECIALTY' AND code IN (${placeholders})`,
    codes
  );
  return Number((rows[0] as RowDataPacket).cnt) === codes.length;
}

const patchSchema = z.object({
  rfc: z.string().max(20).nullable().optional(),
  razonSocial: z.string().max(200).nullable().optional(),
  telefono: z.string().max(20).nullable().optional(),
  especialidades: z.array(z.string().max(20)).max(19).nullable().optional(),
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
  const map: Array<[keyof Omit<PatchData, 'especialidades'>, string]> = [
    ['rfc', 'rfc'],
    ['razonSocial', 'razon_social'],
    ['telefono', 'telefono'],
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

const PROFILE_SELECT_SQL = `
  SELECT
    op.id,
    op.owner_id       AS ownerId,
    op.rfc,
    op.razon_social   AS razonSocial,
    op.telefono,
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
    otc.code           AS ownerType
  FROM owner_profiles op
  JOIN owners o ON o.id = op.owner_id
  JOIN owner_types_catalog otc ON otc.id = o.owner_type_id
  LEFT JOIN neighborhoods n ON n.id = op.neighborhood_id
  LEFT JOIN municipalities m ON m.id = n.municipality_id
  LEFT JOIN states s ON s.id = m.state_id
  WHERE op.owner_id = ?
  LIMIT 1`;

async function fetchEspecialidades(ownerId: number | string): Promise<string[] | null> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT cc.code FROM owner_specialties os
     JOIN common_catalogs cc ON cc.id = os.catalog_id
     WHERE os.owner_id = ? ORDER BY cc.id`,
    [ownerId]
  );
  return rows.length > 0 ? rows.map((r) => r.code as string) : null;
}

function hydrateProfile(row: RowDataPacket, especialidades: string[] | null): RowDataPacket {
  return { ...row, especialidades };
}

async function applySpecialtiesUpdate(
  conn: Awaited<ReturnType<typeof db.getConnection>>,
  ownerId: number | string,
  codes: string[] | null
): Promise<void> {
  await conn.execute<ResultSetHeader>('DELETE FROM owner_specialties WHERE owner_id = ?', [
    ownerId,
  ]);
  if (codes && codes.length > 0) {
    await Promise.all(
      codes.map((code) =>
        conn.execute<ResultSetHeader>(
          `INSERT INTO owner_specialties (owner_id, catalog_id)
           SELECT ?, id FROM common_catalogs WHERE category = 'SPECIALTY' AND code = ? LIMIT 1`,
          [ownerId, code]
        )
      )
    );
  }
}

/** GET /catalogs/specialties y GET /catalogs/areas comparten el mismo esqueleto
 * (jwtGuard + 1 SELECT + reply) — extraído para extinguir la duplicación
 * detectada por SonarCloud entre ambos handlers (FC166 Track A.2, isomorfo). */
async function handleCatalogFetch(
  request: FastifyRequest,
  reply: FastifyReply,
  query: string,
  failCode: string
): Promise<FastifyReply> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
  }
  try {
    const [rows] = await db.execute<RowDataPacket[]>(query);
    return reply.send({ success: true, data: rows });
  } catch (e) {
    request.log.error(e);
    return reply.code(500).send({ success: false, code: failCode });
  }
}

async function handleGetSpecialtiesCatalog(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  return handleCatalogFetch(
    request,
    reply,
    "SELECT code, label FROM common_catalogs WHERE category = 'SPECIALTY' ORDER BY label ASC",
    'SPECIALTIES_FETCH_FAIL'
  );
}

async function handleGetAreasCatalog(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  return handleCatalogFetch(
    request,
    reply,
    "SELECT code, label FROM common_catalogs WHERE category = 'FLEET_AREA' ORDER BY id ASC",
    'AREAS_FETCH_FAIL'
  );
}

async function fetchOwnerProfile(
  request: FastifyRequest,
  reply: FastifyReply,
  ownerId: number | string
): Promise<FastifyReply> {
  try {
    const [rows] = await db.execute<RowDataPacket[]>(PROFILE_SELECT_SQL, [ownerId]);
    if (rows.length === 0) {
      return reply.code(404).send({ success: false, code: 'PROFILE_NOT_FOUND' });
    }
    const especialidades = await fetchEspecialidades(ownerId);
    return reply.send({ success: true, data: hydrateProfile(rows[0], especialidades) });
  } catch (e) {
    request.log.error(e);
    return reply.code(500).send({ success: false, code: 'PROFILE_FETCH_FAIL' });
  }
}

/** GET /owners/me/profile — self-service: resolves ownerId from JWT. */
async function handleGetMyProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
  }
  const caller = request.user as { id: number; permissions: string[] };
  const ownerIds = await getCallerOwnerIds(caller.id);
  if (ownerIds.length === 0) {
    return reply.code(404).send({ success: false, code: 'PROFILE_NOT_FOUND' });
  }
  return fetchOwnerProfile(request, reply, ownerIds[0]);
}

/** GET /owners/:ownerId/profile — admin/scoped, con validación de pertenencia. */
async function handleGetOwnerProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
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
  return fetchOwnerProfile(request, reply, ownerId);
}

/** Ejecuta el UPDATE de campos + especialidades dentro de una única transacción
 * (FC166 Track A.2 — sub-extracción de `applyOwnerProfilePatch` para respetar
 * el cap de 50 líneas de Gate2, isomorfa: mismo SQL/orden/rollback). */
async function runOwnerProfileUpdateTransaction(
  ownerId: number | string,
  fields: string[],
  values: (string | number | null)[],
  hasSpecialtiesUpdate: boolean,
  especialidades: string[] | null | undefined
): Promise<void> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (fields.length > 0) {
      values.push(String(ownerId));
      await conn.execute<ResultSetHeader>(
        `UPDATE owner_profiles SET ${fields.join(', ')} WHERE owner_id = ?`,
        values
      );
    }
    if (hasSpecialtiesUpdate) {
      await applySpecialtiesUpdate(conn, ownerId, especialidades ?? null);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** Lógica compartida de PATCH /owners/me/profile y PATCH /owners/:ownerId/profile
 * (validación de especialidades, campos a actualizar, RFC condicional, transacción)
 * — extraída para extinguir la duplicación detectada por SonarCloud entre ambos
 * handlers (FC166 Track A.2, isomorfo — mismo comportamiento byte a byte,
 * `String(ownerId)` es un no-op para el caso admin donde ya llega como string). */
async function applyOwnerProfilePatch(
  request: FastifyRequest,
  reply: FastifyReply,
  ownerId: number | string,
  parsed: PatchData
): Promise<FastifyReply> {
  if (
    parsed.especialidades !== undefined &&
    parsed.especialidades !== null &&
    !(await validateSpecialtyCodes(parsed.especialidades))
  ) {
    return reply.code(400).send({ success: false, code: 'INVALID_SPECIALTY_CODES' });
  }

  const { fields, values } = buildUpdateFields(parsed);
  const hasSpecialtiesUpdate = parsed.especialidades !== undefined;
  if (fields.length === 0 && !hasSpecialtiesUpdate) {
    return reply.code(400).send({ success: false, code: 'NO_FIELDS_TO_UPDATE' });
  }

  try {
    const [profileRows] = await db.execute<RowDataPacket[]>(
      'SELECT op.id, otc.code AS owner_type FROM owner_profiles op JOIN owners o ON o.id = op.owner_id JOIN owner_types_catalog otc ON otc.id = o.owner_type_id WHERE op.owner_id = ? LIMIT 1',
      [ownerId]
    );
    if (profileRows.length === 0) {
      return reply.code(404).send({ success: false, code: 'PROFILE_NOT_FOUND' });
    }
    const { owner_type: ownerType } = profileRows[0];
    const { rfc } = parsed;
    if (
      rfc !== undefined &&
      (rfc === null || rfc.trim() === '') &&
      (ownerType === 'FLOTILLA' || ownerType === 'CENTER')
    ) {
      return reply.code(400).send({ success: false, code: 'MISSING_RFC' });
    }
    await runOwnerProfileUpdateTransaction(
      ownerId,
      fields,
      values,
      hasSpecialtiesUpdate,
      parsed.especialidades
    );
    return reply.send({ success: true });
  } catch (e) {
    request.log.error(e);
    return reply.code(500).send({ success: false, code: 'PROFILE_UPDATE_FAIL' });
  }
}

/** PATCH /owners/me/profile — self-service update. */
async function handlePatchMyProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
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
  const caller = request.user as { id: number; permissions: string[] };
  const ownerIds = await getCallerOwnerIds(caller.id);
  if (ownerIds.length === 0) {
    return reply.code(404).send({ success: false, code: 'PROFILE_NOT_FOUND' });
  }
  return applyOwnerProfilePatch(request, reply, ownerIds[0], parsed.data);
}

/** PATCH /owners/:ownerId/profile — admin/scoped update. */
async function handlePatchOwnerProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
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
  return applyOwnerProfilePatch(request, reply, ownerId, parsed.data);
}

/** Registra las rutas de perfil de propietario (catálogos, self-service y
 * admin/scoped) — wiring puro, la lógica vive en los handlers nombrados de
 * arriba (Dual-Gate Isolation, FC166 Track A.2). */
export default async function ownerProfileRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /v1/catalogs/specialties — public catalog (jwtGuard only, no permission gate)
  fastify.get('/catalogs/specialties', handleGetSpecialtiesCatalog);

  // GET /v1/catalogs/areas — fleet area catalog (jwtGuard only, no permission gate)
  fastify.get('/catalogs/areas', handleGetAreasCatalog);

  // GET /v1/owners/me/profile — self-service: resolves ownerId from JWT
  fastify.get('/owners/me/profile', handleGetMyProfile);

  // PATCH /v1/owners/me/profile — self-service update
  fastify.patch('/owners/me/profile', handlePatchMyProfile);

  // GET /v1/owners/:ownerId/profile
  fastify.get('/owners/:ownerId/profile', handleGetOwnerProfile);

  // PATCH /v1/owners/:ownerId/profile
  fastify.patch('/owners/:ownerId/profile', handlePatchOwnerProfile);
}
