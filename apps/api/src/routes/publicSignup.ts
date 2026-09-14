import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as PublicSignupService from '../services/publicSignup.service';

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

async function handlePublicSignup(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
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
