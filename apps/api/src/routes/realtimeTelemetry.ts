import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../services/db';

interface TelemetryPingBody {
  unitId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
}

interface TelemetryRow extends RowDataPacket {
  unit_id: string;
  latitude: string;
  longitude: string;
  speed: string;
  heading: string;
  updated_at: string;
}

function hasAdminAccess(permissions: string[]): boolean {
  return permissions.includes('*') || permissions.includes('user:admin');
}

async function getCallerOwnerIds(userId: number): Promise<number[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT owner_id FROM user_owner_membership WHERE user_id = ?',
    [userId]
  );
  return (rows as { owner_id: number }[]).map((r) => r.owner_id);
}

export default async function realtimeTelemetryRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /v1/telemetry/family-units
   * FC-10 VIM_SubUniverse_FamiliarScope FaseA
   * EAL6+: role_id=5 (Familiar) only — scoped to caller's owner via user_owner_membership.
   * Returns fleet units of the owner with latest telemetry per unit (ROW_NUMBER subquery).
   */
  fastify.get('/telemetry/family-units', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const caller = request.user as { id: number; permissions: string[] };

    const [roleRows] = await db.execute<RowDataPacket[]>('SELECT role_id FROM users WHERE id = ?', [
      caller.id,
    ]);
    if (!roleRows.length || (roleRows[0].role_id as number) !== 5) {
      return reply.code(403).send({ error: 'FAMILIAR_SCOPE_REQUIRED' });
    }

    const [memberRows] = await db.execute<RowDataPacket[]>(
      'SELECT owner_id FROM user_owner_membership WHERE user_id = ?',
      [caller.id]
    );
    const ownerIds = (memberRows as { owner_id: number }[]).map((r) => r.owner_id);
    if (ownerIds.length === 0) {
      return reply.send({ units: [] });
    }

    const placeholders = ownerIds.map(() => '?').join(',');
    const [units] = await db.execute<RowDataPacket[]>(
      `SELECT
         fu.id           AS unitId,
         fu.label,
         u.username      AS driverUsername,
         rt.latitude,
         rt.longitude,
         rt.speed,
         rt.heading,
         rt.updated_at   AS lastPing
       FROM fleet_units fu
       LEFT JOIN (
         SELECT unit_id, user_id, latitude, longitude, speed, heading, updated_at,
                ROW_NUMBER() OVER (PARTITION BY unit_id ORDER BY updated_at DESC) AS rn
         FROM realtime_telemetry
       ) rt ON rt.unit_id = fu.id AND rt.rn = 1
       LEFT JOIN users u ON u.id = rt.user_id
       WHERE fu.owner_id IN (${placeholders})
       ORDER BY fu.label ASC`,
      ownerIds
    );

    return reply.send({ units });
  });

  /**
   * POST /v1/telemetry/ping
   * Upsert current GPS position for a fleet unit.
   * EAL6+: caller must own the unit (via user_owner_membership) or have admin access.
   */
  fastify.post<{ Body: TelemetryPingBody }>('/telemetry/ping', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };
    const { unitId, latitude, longitude, speed = 0, heading = 0 } = request.body ?? {};

    if (!unitId || latitude == null || longitude == null) {
      return reply.code(400).send({ error: 'unitId, latitude and longitude are required' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return reply.code(400).send({ error: 'Invalid coordinates' });
    }

    if (!hasAdminAccess(caller.permissions)) {
      // EAL6+: verify caller's owner has this unit
      const [unitRows] = await db.execute<RowDataPacket[]>(
        `SELECT fu.id FROM fleet_units fu
         JOIN user_owner_membership uom ON fu.ownerId = uom.owner_id
         WHERE fu.id = ? AND uom.user_id = ?
         LIMIT 1`,
        [unitId, caller.id]
      );
      if ((unitRows as RowDataPacket[]).length === 0) {
        return reply.code(403).send({ error: 'Access denied' });
      }
    }

    await db.execute<ResultSetHeader>(
      `INSERT INTO realtime_telemetry (user_id, unit_id, latitude, longitude, speed, heading)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         latitude   = VALUES(latitude),
         longitude  = VALUES(longitude),
         speed      = VALUES(speed),
         heading    = VALUES(heading),
         updated_at = CURRENT_TIMESTAMP`,
      [caller.id, unitId, latitude, longitude, speed, heading]
    );

    return reply.code(200).send({ ok: true });
  });

  /**
   * GET /v1/telemetry/units
   * Returns last-known GPS positions for all units visible to the caller.
   * EAL6+: admins see all; others scoped to their owner_id.
   */
  fastify.get('/telemetry/units', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const caller = request.user as { id: number; permissions: string[] };

    let rows: TelemetryRow[];

    if (hasAdminAccess(caller.permissions)) {
      const [result] = await db.execute<TelemetryRow[]>(
        `SELECT rt.unit_id, rt.latitude, rt.longitude, rt.speed, rt.heading, rt.updated_at
         FROM realtime_telemetry rt
         ORDER BY rt.updated_at DESC`
      );
      rows = result;
    } else {
      const ownerIds = await getCallerOwnerIds(caller.id);
      if (ownerIds.length === 0) {
        return reply.send({ units: [] });
      }
      const placeholders = ownerIds.map(() => '?').join(',');
      const [result] = await db.execute<TelemetryRow[]>(
        `SELECT rt.unit_id, rt.latitude, rt.longitude, rt.speed, rt.heading, rt.updated_at
         FROM realtime_telemetry rt
         JOIN fleet_units fu ON rt.unit_id = fu.id
         WHERE fu.ownerId IN (${placeholders})
         ORDER BY rt.updated_at DESC`,
        ownerIds
      );
      rows = result;
    }

    return reply.send({
      units: rows.map((r) => ({
        unitId: r.unit_id,
        latitude: parseFloat(r.latitude),
        longitude: parseFloat(r.longitude),
        speed: parseFloat(r.speed),
        heading: parseFloat(r.heading),
        updatedAt: r.updated_at,
      })),
    });
  });
}
