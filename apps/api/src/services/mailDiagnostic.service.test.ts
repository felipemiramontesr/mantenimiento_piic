import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as MailDiagnosticRepository from './mailDiagnostic.repository';
import { recordAuditLog } from './auditService';
import { sendMailTest } from './mailDiagnostic.service';
import type { MailTransport } from './mailTransport';

vi.mock('./mailDiagnostic.repository', () => ({ findUserContactById: vi.fn() }));
vi.mock('./auditService', () => ({ recordAuditLog: vi.fn() }));
vi.mock('./encryption', () => ({
  default: { decrypt: vi.fn((v: string) => v.replace('enc_', '')) },
}));

/** FC188 F1 — el destinatario sale SOLO de `users.email` descifrado; el fallo de SMTP es un resultado. */

const SENT_AT = new Date('2026-09-18T18:00:00.000Z');
const CONTACT = { id: 1, username: 'GrayMan', email: 'enc_grayman@example.test' };

function makeTransport(result: Awaited<ReturnType<MailTransport['send']>>): {
  transport: MailTransport;
  send: Mock<MailTransport['send']>;
} {
  const send = vi.fn<MailTransport['send']>().mockResolvedValue(result);
  return { transport: { send }, send };
}

describe('FC188 F1 — sendMailTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (MailDiagnosticRepository.findUserContactById as Mock).mockResolvedValue(CONTACT);
  });

  it('envía al correo DESCIFRADO de la cuenta, con la plantilla de prueba, y responde sent + messageId', async () => {
    const { transport, send } = makeTransport({ status: 'sent', messageId: '<m1>' });

    const result = await sendMailTest({ userId: 1, mode: 'smtp', transport, sentAt: SENT_AT });

    expect(result).toEqual({ ok: true, mode: 'smtp', status: 'sent', messageId: '<m1>' });
    const message = send.mock.calls[0][0];
    expect(message.to).toBe('grayman@example.test');
    expect(message.subject).toBe('[ARCHON] Correo de prueba del sistema');
    expect(message.html).toContain('GrayMan');
    expect(message.text).toContain('2026-09-18T18:00:00.000Z');
    expect(message.text).toContain('Transporte activo: smtp.');
  });

  it('un fallo de SMTP es un RESULTADO (failed + código), no un error', async () => {
    const { transport } = makeTransport({ status: 'failed', reason: 'EAUTH' });

    const result = await sendMailTest({ userId: 1, mode: 'smtp', transport, sentAt: SENT_AT });

    expect(result).toEqual({ ok: true, mode: 'smtp', status: 'failed', reason: 'EAUTH' });
  });

  it('transporte deshabilitado ⇒ status disabled, sin reason ni messageId', async () => {
    const { transport } = makeTransport({ status: 'disabled' });

    const result = await sendMailTest({ userId: 1, mode: 'disabled', transport, sentAt: SENT_AT });

    expect(result).toEqual({ ok: true, mode: 'disabled', status: 'disabled' });
  });

  it('audita actor, modo y resultado (nunca contenido) con entity system_mail_test', async () => {
    const { transport } = makeTransport({ status: 'failed', reason: 'ETIMEDOUT' });

    await sendMailTest({ userId: 1, mode: 'smtp', transport, sentAt: SENT_AT });

    expect(recordAuditLog).toHaveBeenCalledWith({
      entity_type: 'system_mail_test',
      entity_id: '1',
      action: 'CREATE',
      snapshot_after: { mode: 'smtp', status: 'failed', reason: 'ETIMEDOUT' },
      reason: 'SOVEREIGN_MAIL_TEST_DISPATCHED',
      user_id: 1,
    });
  });

  it.each([
    ['la cuenta no existe', null],
    ['la cuenta no tiene correo', { ...CONTACT, email: null }],
    ['el correo está vacío', { ...CONTACT, email: '' }],
  ])('sin correo (%s) ⇒ EMAIL_NOT_CONFIGURED, sin enviar ni auditar', async (_label, contact) => {
    (MailDiagnosticRepository.findUserContactById as Mock).mockResolvedValue(contact);
    const { transport, send } = makeTransport({ status: 'sent', messageId: '<x>' });

    const result = await sendMailTest({ userId: 1, mode: 'smtp', transport, sentAt: SENT_AT });

    expect(result).toMatchObject({ ok: false, status: 400, code: 'EMAIL_NOT_CONFIGURED' });
    expect(send).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});
