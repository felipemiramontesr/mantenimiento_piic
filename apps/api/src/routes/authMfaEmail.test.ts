import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import * as EmailMfaService from '../services/emailMfa.service';

/**
 * FC195 F2 — rutas del 2FA por correo (`authMfaEmail.ts`) sobre la app real: firma y alcance de los
 * tokens, traducción HTTP de los resultados del servicio (mockeado: su lógica tiene su propio test).
 */

vi.mock('../services/emailMfa.service', () => ({
  beginEmailSetup: vi.fn(),
  confirmEmailSetup: vi.fn(),
  resendEmailCode: vi.fn(),
}));

type Jwt = {
  sign: (_p: object, _o?: object) => string;
  decode: (_t: string) => Record<string, unknown> & { iat: number; exp: number };
};

describe('POST /v1/auth/mfa/email/* (FC195 F2)', () => {
  const app = buildApp();
  let jwt: Jwt;
  let accessToken: string;
  let setupToken: string;

  beforeAll(async () => {
    await app.ready();
    jwt = (app as unknown as { jwt: Jwt }).jwt;
    accessToken = jwt.sign({ id: 30, roleId: 3, permissions: [], type: 'access' });
    setupToken = jwt.sign({ id: 30, username: 'arc', type: 'mfa_setup' });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const bearer = (t: string): Record<string, string> => ({ Authorization: `Bearer ${t}` });
  const emailSetupTokenFor = (id: number, challengeId = 'ch-1'): string =>
    jwt.sign({ id, challengeId, scope: 'mfa_email_setup' });

  describe('/mfa/email/setup', () => {
    it('con el setupToken de /login: envía el código y firma un emailSetupToken de 10 min', async () => {
      (EmailMfaService.beginEmailSetup as Mock).mockResolvedValue({
        ok: true,
        challengeId: 'ch-1',
        maskedEmail: 'ar•••@piic.com.mx',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/email/setup',
        headers: bearer(setupToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.maskedEmail).toBe('ar•••@piic.com.mx');
      const decoded = jwt.decode(body.data.emailSetupToken);
      expect(decoded).toMatchObject({ id: 30, challengeId: 'ch-1', scope: 'mfa_email_setup' });
      expect(decoded.exp - decoded.iat).toBe(600);
      expect(EmailMfaService.beginEmailSetup).toHaveBeenCalledWith(30, expect.anything());
    });

    it('traduce el fallo del servicio (p. ej. 403 para Ω/MU)', async () => {
      (EmailMfaService.beginEmailSetup as Mock).mockResolvedValue({
        ok: false,
        status: 403,
        code: 'MFA_METHOD_NOT_ALLOWED',
        message: 'm',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/email/setup',
        headers: bearer(accessToken),
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({ success: false, code: 'MFA_METHOD_NOT_ALLOWED', message: 'm' });
    });

    it('sin sesión: 401', async () => {
      const res = await app.inject({ method: 'POST', url: '/v1/auth/mfa/email/setup' });

      expect(res.statusCode).toBe(401);
      expect(EmailMfaService.beginEmailSetup).not.toHaveBeenCalled();
    });
  });

  describe('/mfa/email/verify-setup', () => {
    it('Scenario 1 — código correcto: responde los 8 respaldos una vez', async () => {
      (EmailMfaService.confirmEmailSetup as Mock).mockResolvedValue({
        ok: true,
        backupCodes: ['AAAAA-11111'],
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/email/verify-setup',
        headers: bearer(setupToken),
        payload: { emailSetupToken: emailSetupTokenFor(30), code: 'ABCDEFGH' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.backupCodes).toEqual(['AAAAA-11111']);
      expect(EmailMfaService.confirmEmailSetup).toHaveBeenCalledWith(30, 'ch-1', 'ABCDEFGH');
    });

    it('el emailSetupToken de OTRO usuario no sirve: 401 sin tocar el servicio', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/email/verify-setup',
        headers: bearer(setupToken),
        payload: { emailSetupToken: emailSetupTokenFor(99), code: 'ABCDEFGH' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().code).toBe('TOKEN_EXPIRED_OR_REVOKED');
      expect(EmailMfaService.confirmEmailSetup).not.toHaveBeenCalled();
    });

    it.each([
      ['un mfaToken de login (scope distinto)', 'login'],
      ['un token inválido', 'garbage'],
    ])('%s en lugar del emailSetupToken: 401', async (_label, kind) => {
      const token =
        kind === 'login' ? jwt.sign({ id: 30, challengeId: 'c', scope: 'mfa_challenge' }) : 'x.y.z';

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/email/verify-setup',
        headers: bearer(setupToken),
        payload: { emailSetupToken: token, code: 'ABCDEFGH' },
      });

      expect(res.statusCode).toBe(401);
      expect(EmailMfaService.confirmEmailSetup).not.toHaveBeenCalled();
    });

    it('cuerpo incompleto: 400 VALIDATION_ERROR', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/email/verify-setup',
        headers: bearer(setupToken),
        payload: { code: 'ABCDEFGH' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
    });

    it('traduce el código incorrecto del servicio a 401', async () => {
      (EmailMfaService.confirmEmailSetup as Mock).mockResolvedValue({
        ok: false,
        status: 401,
        code: 'MFA_INVALID_CODE',
        message: 'm',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/email/verify-setup',
        headers: bearer(accessToken),
        payload: { emailSetupToken: emailSetupTokenFor(30), code: 'ZZZZZZZZ' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().code).toBe('MFA_INVALID_CODE');
    });
  });

  describe('/mfa/email/resend', () => {
    it('reto de login: reenvía y responde un mfaToken NUEVO (mismo reto, 10 min)', async () => {
      (EmailMfaService.resendEmailCode as Mock).mockResolvedValue({
        ok: true,
        maskedEmail: 'ar•••@piic.com.mx',
        codeSent: true,
        resendsLeft: 1,
      });
      const loginToken = jwt.sign({ id: 30, challengeId: 'ch-9', scope: 'mfa_challenge' });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/email/resend',
        payload: { token: loginToken },
      });

      expect(res.statusCode).toBe(200);
      const { data } = res.json();
      expect(data).toMatchObject({
        maskedEmail: 'ar•••@piic.com.mx',
        codeSent: true,
        resendsLeft: 1,
      });
      const decoded = jwt.decode(data.token);
      expect(decoded).toMatchObject({ id: 30, challengeId: 'ch-9', scope: 'mfa_challenge' });
      expect(decoded.exp - decoded.iat).toBe(600);
      expect(EmailMfaService.resendEmailCode).toHaveBeenCalledWith(
        30,
        'ch-9',
        'login',
        expect.anything()
      );
    });

    it('reto de enrolamiento: usa la plantilla de activación', async () => {
      (EmailMfaService.resendEmailCode as Mock).mockResolvedValue({
        ok: true,
        maskedEmail: null,
        codeSent: false,
        resendsLeft: 0,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/email/resend',
        payload: { token: emailSetupTokenFor(30, 'ch-2') },
      });

      expect(res.statusCode).toBe(200);
      expect(EmailMfaService.resendEmailCode).toHaveBeenCalledWith(
        30,
        'ch-2',
        'setup',
        expect.anything()
      );
    });

    it('Scenario 5 — traduce el 429 del servicio', async () => {
      (EmailMfaService.resendEmailCode as Mock).mockResolvedValue({
        ok: false,
        status: 429,
        code: 'RESEND_COOLDOWN_ACTIVE',
        message: 'm',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/email/resend',
        payload: { token: emailSetupTokenFor(30) },
      });

      expect(res.statusCode).toBe(429);
      expect(res.json().code).toBe('RESEND_COOLDOWN_ACTIVE');
    });

    it('un access token o un refresh token no son tokens de reto: 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/email/resend',
        payload: { token: accessToken },
      });

      expect(res.statusCode).toBe(401);
      expect(EmailMfaService.resendEmailCode).not.toHaveBeenCalled();
    });

    it('sin token: 400 VALIDATION_ERROR', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/email/resend',
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
