import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';
import requirePermission from '../middleware/requirePermission';

const vimQuerySchema = z.object({
  make: z.string().min(1, 'make es requerido'),
  model: z.string().min(1, 'model es requerido'),
  year: z.string().regex(/^\d{4}$/, 'year debe ser un año de 4 dígitos'),
});

type SignalLevel = 'SEÑAL' | 'INVESTIGAR' | 'DATOS_INSUFICIENTES';

function resolveSignalLevel(score: number): SignalLevel {
  if (score >= 0.6) return 'SEÑAL';
  if (score >= 0.3) return 'INVESTIGAR';
  return 'DATOS_INSUFICIENTES';
}

// FC 082 F3c Cond.1 (Bravo) — enum scope 'suite'/'global' retirado.
// view_fleet_model_failure_patterns (mig.171) es inteligencia agregada
// CROSS-TENANT por diseño (patrones de falla por make/model/year a través de
// toda la flota, sin columna tenant_id — análogo a datos de recall NHTSA,
// industry-wide) — no existe un "scope propio del tenant" real que filtrar.
// El default 'suite' anterior ya se comportaba idéntico a 'global' (mismo
// resultado sin filtro), haciendo el gate fleet:global evitable por el
// caller — se cierra exigiéndolo siempre, sin bypass por default.
export default async function recallsVimRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Archon Protection: Session required' });
    }
  });

  fastify.get(
    '/recalls/vim-patterns',
    { preHandler: [requirePermission('intelligence:recall:view')] },
    async (request: FastifyRequest, reply) => {
      const parsed = vimQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.errors[0].message });
      }
      const { make, model, year } = parsed.data;
      const { permissions } = request.user as { id: number; permissions?: string[] };

      const hasGlobal = permissions?.includes('*') || permissions?.includes('fleet:global');
      if (!hasGlobal) {
        return reply.code(403).send({ error: 'Requiere permiso fleet:global' });
      }

      const [patterns] = await db.execute<RowDataPacket[]>(
        `SELECT * FROM view_fleet_model_failure_patterns
         WHERE make = ? AND model = ? AND year = ?
         ORDER BY confidence_score DESC`,
        [make, model, Number(year)]
      );

      const [nhtsaRows] = await db.execute<RowDataPacket[]>(
        'SELECT COUNT(*) AS cnt FROM catalog_recalls WHERE make = ? AND model = ? AND year = ?',
        [make, model, Number(year)]
      );
      const nhtsaCovered = Number(nhtsaRows[0].cnt) > 0;

      const data = patterns.map((p) => ({
        brand_id: p.brand_id,
        model_id: p.model_id,
        make: p.make,
        model: p.model,
        year: p.year,
        failure_category: p.failure_category,
        occurrence_count: p.occurrence_count,
        affected_units: p.affected_units,
        avg_km_at_failure: p.avg_km_at_failure,
        km_std_dev: p.km_std_dev,
        avg_cost_mxn: p.avg_cost_mxn,
        first_seen_at: p.first_seen_at,
        confidence_score: Number(p.confidence_score),
        nhtsa_covered: nhtsaCovered,
        signal_level: resolveSignalLevel(Number(p.confidence_score)),
      }));

      return reply.send({ success: true, count: data.length, data });
    }
  );
}
