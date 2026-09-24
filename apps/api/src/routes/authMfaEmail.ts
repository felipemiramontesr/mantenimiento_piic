import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import * as EmailMfaService from '../services/emailMfa.service';
import type { MfaCodePurpose } from '../services/mailTemplates';

/**
 * FC195 F2 — rutas del 2FA por correo bajo `/v1/auth` (las registra `authRoutes`). Solo parsean,
 * validan el token y traducen el resultado del servicio: la regla de quién puede usar el correo
 * (solo Arc, Invariante 9) y los límites viven en `emailMfa.service.ts`.
 *
 * Tokens: el enrolamiento emite un `emailSetupToken` (scope `mfa_email_setup`, 10 min) atado al
 * reto; el login por correo usa el `mfaToken` de siempre (scope `mfa_challenge`). El reenvío acepta
 * ambos y responde un token nuevo del mismo scope, para que token y código caduquen juntos.
 */

const EMAIL_SETUP_SCOPE = 'mfa_email_setup';
const LOGIN_CHALLENGE_SCOPE = 'mfa_challenge';
const TOKEN_TTL = '10m';

interface EmailChallengeTokenPayload {
  id: number;
  challengeId: string;
  scope: string;
}

/** Límite por IP como el de `/login`: cada llamada puede enviar un correo. */
const emailRateLimit = {
  config: {
    rateLimit: { max: process.env.NODE_ENV === 'production' ? 10 : 1000, timeWindow: '1 minute' },
  },
};

function sendFailure(reply: FastifyReply, result: EmailMfaService.EmailMfaFailure): FastifyReply {
  return reply
    .code(result.status)
    .send({ success: false, code: result.code, message: result.message });
}

function tokenRejected(reply: FastifyReply): FastifyReply {
  return reply.code(401).send({
    success: false,
    code: 'TOKEN_EXPIRED_OR_REVOKED',
    message: 'El token expiró o no es válido para este flujo',
  });
}

/** Verifica firma y expiración de un token de reto y exige uno de los `scopes` dados. */
function readChallengeToken(
  request: FastifyRequest,
  token: string,
  scopes: readonly string[]
): EmailChallengeTokenPayload | null {
  try {
    const payload = request.server.jwt.verify<EmailChallengeTokenPayload>(token);
    return scopes.includes(payload.scope) ? payload : null;
  } catch {
    return null;
  }
}

function signChallengeToken(request: FastifyRequest, payload: EmailChallengeTokenPayload): string {
  return request.server.jwt.sign(
    { id: payload.id, challengeId: payload.challengeId, scope: payload.scope },
    { expiresIn: TOKEN_TTL }
  );
}

/** POST /mfa/email/setup — envía el código de activación al correo registrado del usuario. Acepta
 *  la sesión normal o el `setupToken` de `/login` (mismo criterio que `/mfa/setup`). */
async function handleEmailSetup(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  await request.jwtVerify();
  const { id } = request.user as { id: number };
  const result = await EmailMfaService.beginEmailSetup(id, request.server.mailTransport);
  if (!result.ok) return sendFailure(reply, result);
  const emailSetupToken = signChallengeToken(request, {
    id,
    challengeId: result.challengeId,
    scope: EMAIL_SETUP_SCOPE,
  });
  return reply.send({ success: true, data: { emailSetupToken, maskedEmail: result.maskedEmail } });
}

const verifySetupSchema = z.object({ emailSetupToken: z.string().min(1), code: z.string().min(1) });

/** POST /mfa/email/verify-setup — confirma con el código recibido y responde los 8 respaldos UNA
 *  vez. El token del reto debe ser del MISMO usuario autenticado. */
async function handleEmailVerifySetup(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  await request.jwtVerify();
  const parsed = verifySetupSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'emailSetupToken y code son requeridos',
    });
  }
  const { id } = request.user as { id: number };
  const payload = readChallengeToken(request, parsed.data.emailSetupToken, [EMAIL_SETUP_SCOPE]);
  if (payload?.id !== id) return tokenRejected(reply);
  const result = await EmailMfaService.confirmEmailSetup(id, payload.challengeId, parsed.data.code);
  if (!result.ok) return sendFailure(reply, result);
  return reply.send({ success: true, data: { backupCodes: result.backupCodes } });
}

const resendSchema = z.object({ token: z.string().min(1) });

/** POST /mfa/email/resend — código nuevo para un reto de login (`mfaToken`) o de enrolamiento
 *  (`emailSetupToken`); el anterior deja de servir. Sin sesión: el propio token prueba el reto. */
async function handleEmailResend(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = resendSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply
      .code(400)
      .send({ success: false, code: 'VALIDATION_ERROR', message: 'token es requerido' });
  }
  const payload = readChallengeToken(request, parsed.data.token, [
    LOGIN_CHALLENGE_SCOPE,
    EMAIL_SETUP_SCOPE,
  ]);
  if (!payload) return tokenRejected(reply);
  const purpose: MfaCodePurpose = payload.scope === EMAIL_SETUP_SCOPE ? 'setup' : 'login';
  const result = await EmailMfaService.resendEmailCode(
    payload.id,
    payload.challengeId,
    purpose,
    request.server.mailTransport
  );
  if (!result.ok) return sendFailure(reply, result);
  return reply.send({
    success: true,
    data: {
      token: signChallengeToken(request, payload),
      maskedEmail: result.maskedEmail,
      codeSent: result.codeSent,
      resendsLeft: result.resendsLeft,
    },
  });
}

/** Registra las 3 rutas del 2FA por correo en el plugin de `/v1/auth`. */
export default function registerEmailMfaRoutes(fastify: FastifyInstance): void {
  fastify.post('/mfa/email/setup', emailRateLimit, handleEmailSetup);
  fastify.post('/mfa/email/verify-setup', emailRateLimit, handleEmailVerifySetup);
  fastify.post('/mfa/email/resend', emailRateLimit, handleEmailResend);
}
