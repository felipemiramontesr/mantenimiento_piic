import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../services/db';
import requirePermission from '../middleware/requirePermission';

const NHTSA_BASE = 'https://api.nhtsa.gov/recalls/recallsByVehicle';
const NHTSA_TIMEOUT_MS = 8_000;

interface NhtsaRecallResult {
  CampaignNumber: string;
  Subject: string;
  Summary: string;
  Remedy: string;
  Consequence: string;
  Component: string;
  Manufacturer: string;
  NHTSAActionNumber: string;
}

interface NhtsaApiResponse {
  Count: number;
  Message: string;
  results: NhtsaRecallResult[];
}

const searchSchema = z.object({
  make: z.string().min(1, 'make es requerido'),
  model: z.string().min(1, 'model es requerido'),
  year: z.string().regex(/^\d{4}$/, 'year debe ser un año de 4 dígitos'),
});

const importSchema = z.object({
  campaignNumber: z.string().min(1, 'campaignNumber es requerido'),
  make: z.string().min(1, 'make es requerido'),
  model: z.string().min(1, 'model es requerido'),
  year: z.number({ required_error: 'year es requerido' }).int().min(1990).max(2100),
  description: z.string().optional(),
  publishedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'publishedDate debe ser YYYY-MM-DD')
    .optional(),
});

async function fetchNhtsa(url: string): Promise<NhtsaApiResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NHTSA_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`NHTSA HTTP ${res.status}`);
    return (await res.json()) as NhtsaApiResponse;
  } finally {
    clearTimeout(timer);
  }
}

export default async function recallsNhtsaRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Archon Protection: Session required' });
    }
  });

  fastify.get(
    '/recalls/nhtsa',
    { preHandler: [requirePermission('fleet:view')] },
    async (request, reply) => {
      const parsed = searchSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.errors[0].message });
      }
      const { make, model, year } = parsed.data;

      const url = `${NHTSA_BASE}?make=${encodeURIComponent(make)}&model=${encodeURIComponent(
        model
      )}&modelYear=${encodeURIComponent(year)}`;

      try {
        const json = await fetchNhtsa(url);
        const data = (json.results ?? []).map((r) => ({
          campaignNumber: r.CampaignNumber,
          subject: r.Subject,
          summary: r.Summary,
          remedy: r.Remedy,
          consequence: r.Consequence,
          component: r.Component,
          manufacturer: r.Manufacturer,
          nhtsaActionNumber: r.NHTSAActionNumber,
        }));
        return reply.send({ success: true, count: data.length, data });
      } catch {
        return reply.code(503).send({ error: 'NHTSA API no disponible' });
      }
    }
  );

  fastify.post(
    '/recalls/nhtsa/import',
    { preHandler: [requirePermission('fleet:write')] },
    async (request, reply) => {
      const parsed = importSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.errors[0].message });
      }
      const { campaignNumber, make, model, year, description, publishedDate } = parsed.data;

      const [existing] = await db.execute<RowDataPacket[]>(
        'SELECT id FROM catalog_recalls WHERE campaign_code = ?',
        [campaignNumber]
      );
      if (existing.length > 0) {
        return reply.send({ success: true, recall_id: existing[0].id as number, imported: false });
      }

      const descValue = description ?? `Recall NHTSA ${campaignNumber} — ${make} ${model} ${year}`;
      const pubDate = publishedDate ?? new Date().toISOString().slice(0, 10);

      const [result] = await db.execute<ResultSetHeader>(
        `INSERT INTO catalog_recalls (campaign_code, description, make, model, year, published_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [campaignNumber, descValue, make, model, year, pubDate]
      );

      return reply.code(201).send({ success: true, recall_id: result.insertId, imported: true });
    }
  );
}
