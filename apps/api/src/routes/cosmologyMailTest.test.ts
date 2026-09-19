import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import type { FastifyInstance } from 'fastify';
import buildApp from '../index';
import db from '../services/db';
import { MemoryMailTransport } from '../services/mailTransport';

/**
 * FC188 F1 — POST /v1/cosmology/mail/test (Cond.R-188 R1–R4). Cada test usa su PROPIA instancia
 * de `buildApp()`: el limitador de peticiones vive en memoria por instancia, así que los conteos
 * de un test nunca contaminan a otro. 0 sockets: el transporte es el `MemoryMailTransport` que
 * `buildApp` decora bajo test (R10).
 */

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => v.replace('enc_', '')),
  },
}));

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
  },
}));

const OWN_EMAIL = 'grayman@example.test';
const URL_MAIL_TEST = '/v1/cosmology/mail/test';

function mockContact(row: object | null): void {
  (db.execute as Mock).mockResolvedValue([row === null ? [] : [row], undefined]);
}

describe('FC188 F1 — POST /v1/cosmology/mail/test', () => {
  let app: FastifyInstance;
  let omegaHeader: Record<string, string>;

  function bearer(payload: object): Record<string, string> {
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    return { authorization: `Bearer ${jwt.sign(payload)}` };
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    app = buildApp();
    await app.ready();
    omegaHeader = bearer({ id: 1, username: 'GrayMan', roleId: 0, permissions: ['*'] });
    mockContact({ id: 1, username: 'GrayMan', email: `enc_${OWN_EMAIL}` });
  });

  const outbox = (): readonly { to: string; subject: string }[] =>
    (app.mailTransport as MemoryMailTransport).outbox;

  it('Scenario 1 — Ω recibe 200 {mode, status:sent, messageId} y el correo llega A SU PROPIA cuenta', async () => {
    const response = await app.inject({ method: 'POST', url: URL_MAIL_TEST, headers: omegaHeader });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      mode: 'memory',
      status: 'sent',
      messageId: 'memory-1',
    });
    expect(outbox()).toHaveLength(1);
    expect(outbox()[0].to).toBe(OWN_EMAIL);
    expect(outbox()[0].subject).toBe('[ARCHON] Correo de prueba del sistema');
  });

  it('anti-relay — un body con "to" se IGNORA: el destinatario sigue siendo el correo propio', async () => {
    await app.inject({
      method: 'POST',
      url: URL_MAIL_TEST,
      headers: omegaHeader,
      payload: { to: 'atacante@example.test', recipient: 'otro@example.test' },
    });

    expect(outbox().map((m) => m.to)).toEqual([OWN_EMAIL]);
  });

  it('audita el envío en administrative_audit_logs con el evento SOVEREIGN_MAIL_TEST_DISPATCHED', async () => {
    await app.inject({ method: 'POST', url: URL_MAIL_TEST, headers: omegaHeader });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO administrative_audit_logs'),
      expect.arrayContaining(['system_mail_test', '1', 'CREATE', 'SOVEREIGN_MAIL_TEST_DISPATCHED'])
    );
  });

  it('Scenario 2 — un fallo de SMTP responde 200 con status:failed y el código (sin host/usuario/contraseña)', async () => {
    vi.spyOn(app.mailTransport, 'send').mockResolvedValue({ status: 'failed', reason: 'EAUTH' });

    const response = await app.inject({ method: 'POST', url: URL_MAIL_TEST, headers: omegaHeader });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      mode: 'memory',
      status: 'failed',
      reason: 'EAUTH',
    });
  });

  it('SMTP_* ausentes ⇒ 200 con status:disabled', async () => {
    vi.spyOn(app.mailTransport, 'send').mockResolvedValue({ status: 'disabled' });

    const response = await app.inject({ method: 'POST', url: URL_MAIL_TEST, headers: omegaHeader });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ success: true, status: 'disabled' });
  });

  it('cuenta sin correo registrado ⇒ 400 EMAIL_NOT_CONFIGURED y NO se envía nada', async () => {
    mockContact({ id: 1, username: 'GrayMan', email: null });

    const response = await app.inject({ method: 'POST', url: URL_MAIL_TEST, headers: omegaHeader });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ success: false, code: 'EMAIL_NOT_CONFIGURED' });
    expect(outbox()).toHaveLength(0);
  });

  it('Scenario 3 — sin token ⇒ 401; usuario que no es Ω ⇒ 403; en ambos casos NO se envía nada', async () => {
    const anonymous = await app.inject({ method: 'POST', url: URL_MAIL_TEST });
    const arc = await app.inject({
      method: 'POST',
      url: URL_MAIL_TEST,
      headers: bearer({ id: 20, username: 'arc.user', roleId: 3, permissions: ['fleet:view'] }),
    });

    expect(anonymous.statusCode).toBe(401);
    expect(arc.statusCode).toBe(403);
    expect(outbox()).toHaveLength(0);
  });
});

describe('FC188 F1 — límite de 3/hora POR USUARIO (Scenario 4)', () => {
  let app: FastifyInstance;

  function omega(id: number): Record<string, string> {
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    const token = jwt.sign({ id, username: `omega${id}`, roleId: 0, permissions: ['*'] });
    return { authorization: `Bearer ${token}` };
  }

  const send = (
    headers: Record<string, string>
  ): Promise<{ statusCode: number; json: () => unknown }> =>
    app.inject({ method: 'POST', url: URL_MAIL_TEST, headers });

  beforeEach(async () => {
    vi.clearAllMocks();
    app = buildApp();
    await app.ready();
    mockContact({ id: 1, username: 'omega', email: `enc_${OWN_EMAIL}` });
  });

  it('el 4º envío dentro de la hora ⇒ 429 RATE_LIMIT_EXCEEDED y solo salieron 3 correos', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop -- secuencial a propósito: se cuenta el orden
      statuses.push((await send(omega(1))).statusCode);
    }
    const fourth = await send(omega(1));

    expect(statuses).toEqual([200, 200, 200]);
    expect(fourth.statusCode).toBe(429);
    expect(fourth.json()).toMatchObject({ success: false, code: 'RATE_LIMIT_EXCEEDED' });
    expect((app.mailTransport as MemoryMailTransport).outbox).toHaveLength(3);
  });

  it('el límite es POR USUARIO: otro Ω distinto (misma IP) conserva su propio cupo', async () => {
    await Promise.all([1, 2, 3].map(() => send(omega(1))));
    expect((await send(omega(1))).statusCode).toBe(429);

    mockContact({ id: 2, username: 'omega2', email: `enc_${OWN_EMAIL}` });
    expect((await send(omega(2))).statusCode).toBe(200);
  });

  it('el límite NO se filtra a las demás rutas de Ω (el guard compartido no se contamina)', async () => {
    await Promise.all([1, 2, 3].map(() => send(omega(1))));
    expect((await send(omega(1))).statusCode).toBe(429);

    (db.execute as Mock).mockResolvedValue([[], undefined]);
    const others = await Promise.all(
      [1, 2, 3, 4, 5].map(() =>
        app.inject({ method: 'GET', url: '/v1/cosmology/universes', headers: omega(1) })
      )
    );

    expect(others.map((r) => r.statusCode)).toEqual([200, 200, 200, 200, 200]);
  });
});
