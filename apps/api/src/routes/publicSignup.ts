import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as PublicSignupService from '../services/publicSignup.service';
import { botChallengeVerifier } from '../services/botChallenge.service';

/**
 * FC177 F2 — Public_Signup_Endpoint_And_Form. The ONE unauthenticated write endpoint in the
 * entire API (Cond.R-177 R2, Bravo) — deliberately a new path, `/v1/public/signup`, not a
 * revival of the retired `POST /v1/auth/register` (FC082 F0c/F3b — different chassis, different
 * invariants, 0 shared history). Zero-SQL (I1): parses, delegates to the service, maps the
 * result — no persistence logic here.
 */

// Cond.R-177 R3 (Bravo) — RFC SAT canónico (persona física 13 / moral 12 caracteres).
const RFC_REGEX = /^[A-Z&Ñ]{3,4}\d{6}[A-V1-9][A-Z\d]{2}$/;

const publicSignupBodySchema = z.object({
  fullName: z.string().min(1).max(255),
  email: z.string().email().max(100),
  password: z.string().min(8).max(255),
  rfc: z.string().regex(RFC_REGEX, 'RFC inválido'),
  razonSocial: z.string().min(1).max(255),
  regimenFiscal: z.string().min(1).max(10),
  codigoPostalFiscal: z.string().regex(/^\d{5}$/, 'Código Postal debe ser de 5 dígitos'),
  usoCfdi: z.string().min(1).max(10).default('S01'),
  telefono: z.string().max(20).optional(),
});

/** FC199 F3 — piso anti-envío instantáneo del formulario, contado desde la emisión del reto. */
const SIGNUP_MIN_FILL_MS = 1500;

/** Señales anti-bot del signup (Cond.R-199): campo trampa `website_url` vacío y reto PoW válido con
 *  el piso de tiempo. Se revisan ANTES de validar el formulario, de argon2 y de la DB (Inv-1). */
async function passesBotChecks(body: unknown): Promise<boolean> {
  const fields = (body ?? {}) as { altcha_payload?: unknown; website_url?: unknown };
  if (typeof fields.website_url === 'string' && fields.website_url.trim() !== '') return false;
  const payload = typeof fields.altcha_payload === 'string' ? fields.altcha_payload : undefined;
  return botChallengeVerifier.verify(payload, { minAgeMs: SIGNUP_MIN_FILL_MS });
}

async function handlePublicSignup(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  // Misma respuesta para trampa, reto ausente, falso, repetido o demasiado rápido: no dice cuál falló.
  if (!(await passesBotChecks(request.body))) {
    return reply.code(400).send({ success: false, code: 'BOT_CHALLENGE_FAILED' });
  }
  const parsed = publicSignupBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR' });
  }
  const result = await PublicSignupService.publicSignup(parsed.data);
  if (!result.ok) {
    return reply
      .code(result.status)
      .send({ success: false, code: result.code, message: result.message });
  }
  return reply.code(201).send({ success: true });
}

/** `/v1/public/signup` — rate-limited stricter than `/login` (Cond.R-177 R3): argon2 hashing +
 *  a DB write make each request costlier than a login attempt, and it's the one surface a
 *  fully anonymous caller can hit at all. */
export default async function publicSignupRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/signup',
    {
      config: {
        rateLimit: {
          max: process.env.NODE_ENV === 'production' ? 5 : 1000,
          timeWindow: '1 minute',
        },
      },
    },
    handlePublicSignup
  );
}
