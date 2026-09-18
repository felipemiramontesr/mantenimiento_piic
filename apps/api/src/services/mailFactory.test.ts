import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import nodemailer from 'nodemailer';
import { createMailTransport, logMailStatus } from './mailFactory';
import type { MailStatusLogger } from './mailFactory';
import { MemoryMailTransport, disabledMailTransport } from './mailTransport';
import { SmtpMailTransport } from './smtpMailTransport';
import type { MailConfig, SmtpMailConfig } from './mailConfig';

/**
 * FC187 F1 (R10) — `nodemailer` se mockea por completo: ni siquiera se construye un cliente real.
 * `logMailStatus` no debe filtrar credenciales en ningún modo.
 */
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn() } }));

const SMTP_CONFIG: SmtpMailConfig = {
  mode: 'smtp',
  host: 'smtp.example.test',
  port: 465,
  secure: true,
  user: 'buzon@example.test',
  pass: 'not-a-real-value',
  fromName: 'Archon ERP',
  fromAddress: 'buzon@example.test',
};

const createTransportMock = vi.mocked(nodemailer.createTransport);

describe('FC187 F1 — createMailTransport', () => {
  beforeEach(() => {
    createTransportMock.mockReset();
  });

  it('smtp ⇒ SmtpMailTransport que crea el cliente de nodemailer con TLS exigido y envía por él', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: '<id>' });
    createTransportMock.mockReturnValue({ sendMail } as never);

    const transport = createMailTransport(SMTP_CONFIG);

    expect(transport).toBeInstanceOf(SmtpMailTransport);
    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.test',
        port: 465,
        secure: true,
        requireTLS: true,
      })
    );
    const sent = await transport.send({ to: 'a@example.test', subject: 's', html: 'h', text: 't' });
    expect(sent).toEqual({ status: 'sent', messageId: '<id>' });
  });

  it('smtp en otro puerto ⇒ secure=false pero requireTLS SIEMPRE true (STARTTLS exigido, nunca texto plano)', () => {
    createTransportMock.mockReturnValue({ sendMail: vi.fn() } as never);

    createMailTransport({ ...SMTP_CONFIG, port: 587, secure: false });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: false, requireTLS: true })
    );
  });

  it('memory ⇒ MemoryMailTransport y NO toca nodemailer', () => {
    expect(createMailTransport({ mode: 'memory' })).toBeInstanceOf(MemoryMailTransport);
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it('disabled ⇒ el transporte deshabilitado y NO toca nodemailer', () => {
    expect(createMailTransport({ mode: 'disabled', reason: 'x' })).toBe(disabledMailTransport);
    expect(createTransportMock).not.toHaveBeenCalled();
  });
});

describe('FC187 F1 — logMailStatus (solo en el log de arranque, sin credenciales)', () => {
  type LogFn = Mock<(message: string) => void>;

  function makeLogger(): MailStatusLogger & { info: LogFn; warn: LogFn } {
    return { info: vi.fn<(message: string) => void>(), warn: vi.fn<(message: string) => void>() };
  }

  it('smtp 465 ⇒ info con host:puerto y TLS implícito, sin usuario ni contraseña', () => {
    const log = makeLogger();
    logMailStatus(log, SMTP_CONFIG);

    expect(log.warn).not.toHaveBeenCalled();
    const message = String(log.info.mock.calls[0][0]);
    expect(message).toContain('smtp.example.test:465');
    expect(message).toContain('TLS implícito');
    expect(message).not.toContain('not-a-real-value');
    expect(message).not.toContain('buzon@example.test');
  });

  it('smtp en otro puerto ⇒ info con STARTTLS', () => {
    const log = makeLogger();
    logMailStatus(log, { ...SMTP_CONFIG, port: 587, secure: false });
    expect(String(log.info.mock.calls[0][0])).toContain('STARTTLS');
  });

  it('memory ⇒ info', () => {
    const log = makeLogger();
    logMailStatus(log, { mode: 'memory' });
    expect(String(log.info.mock.calls[0][0])).toContain('memoria');
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('disabled ⇒ ADVERTENCIA con la razón (no un error)', () => {
    const log = makeLogger();
    const config: MailConfig = { mode: 'disabled', reason: 'faltan variables SMTP_PASS' };
    logMailStatus(log, config);

    expect(log.info).not.toHaveBeenCalled();
    const message = String(log.warn.mock.calls[0][0]);
    expect(message).toContain('DESACTIVADO');
    expect(message).toContain('faltan variables SMTP_PASS');
  });
});
