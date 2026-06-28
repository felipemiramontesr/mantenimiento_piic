import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * FC-18 FaseD-2 — AES field masking onSend hook (A03:2021 Sensitive Data Exposure)
 *
 * Maps each decrypt permission slug to the JSON field(s) it protects.
 * If the user lacks the permission, the field value is replaced with '***'
 * in the serialized response — BEFORE it reaches the client.
 *
 * Supports both single objects and arrays (list endpoints).
 *
 * Usage (on the route):
 *   fastify.get('/fleet/:id', {
 *     onSend: [
 *       requireFieldPermission('fleet:unit:field:vin:decrypt'),
 *       requireFieldPermission('fleet:unit:field:plates:decrypt'),
 *       requireFieldPermission('fleet:unit:field:circcard:decrypt'),
 *     ],
 *   }, handler);
 */

const FIELD_MAP: Readonly<Record<string, readonly string[]>> = {
  'fleet:unit:field:vin:decrypt': ['numeroSerie'],
  'fleet:unit:field:plates:decrypt': ['placas'],
  'fleet:unit:field:circcard:decrypt': ['circulationCardNumber'],
};

function maskFields(value: unknown, fields: readonly string[], mask: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskFields(item, fields, mask));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        fields.includes(k) ? [k, mask] : [k, v]
      )
    );
  }
  return value;
}

const requireFieldPermission =
  (permSlug: string) =>
  async (request: FastifyRequest, _reply: FastifyReply, payload: unknown): Promise<unknown> => {
    if (!request.user) return payload;

    const { permissions } = request.user as { permissions: string[] };

    // Omnipotent or user holds the decrypt capability → pass through
    if (permissions.includes('*') || permissions.includes(permSlug)) return payload;

    const fields = FIELD_MAP[permSlug];
    if (!fields?.length) return payload;

    if (typeof payload !== 'string') return payload;

    try {
      const parsed: unknown = JSON.parse(payload);
      const masked = maskFields(parsed, fields, '***');
      return JSON.stringify(masked);
    } catch {
      return payload;
    }
  };

export default requireFieldPermission;
