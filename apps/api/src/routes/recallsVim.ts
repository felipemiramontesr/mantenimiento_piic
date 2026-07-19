import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';
import requirePermission from '../middleware/requirePermission';

const vimQuerySchema = z.object({
  make: z.string().min(1, 'make es requerido'),
  model: z.string().min(1, 'model es requerido'),
  year: z.string().regex(/^\d{4}$/, 'year debe ser un año de 4 dígitos'),
  scope: z.enum(['suite', 'global']).default('suite'),
});

type SignalLevel = 'SEÑAL' | 'INVESTIGAR' | 'DATOS_INSUFICIENTES';

function resolveSignalLevel(score: number): SignalLevel {
  if (score >= 0.6) return 'SEÑAL';
  if (score >= 0.3) return 'INVESTIGAR';
  return 'DATOS_INSUFICIENTES';
}

// FC 082 F0c — eje suite eliminado (migración 164): el scope 'suite' conserva
// el nombre por compatibilidad pero se comporta como el camino sin-suite ya
// legislado (VIM-F-10): consulta sin filtro. F3 re-ancla el scope al Arc.
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
      const { make, model, year, scope } = parsed.data;
      const { permissions } = request.user as { id: number; permissions?: string[] };

      if (scope === 'global') {
        const hasGlobal = permissions?.includes('*') || permissions?.includes('fleet:global');
        if (!hasGlobal) {
          return reply.code(403).send({ error: 'Requiere permiso fleet:global para scope global' });
        }
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
