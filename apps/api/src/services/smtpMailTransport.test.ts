import { describe, it, expect, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { SmtpMailTransport, buildSmtpTransportOptions } from './smtpMailTransport';
import type { CreateSmtpMailer, SmtpMailer, SmtpSendOptions } from './smtpMailTransport';
import type { SmtpMailConfig } from './mailConfig';
import type { MailMessage } from './mailTransport';

/**
 * FC187 F1 (R10) — el transporte SMTP recibe la fábrica del cliente: aquí un doble o el
 * `jsonTransport` REAL de nodemailer (compone el mensaje completo, cero red).
 */

const CONFIG: SmtpMailConfig = {
  mode: 'smtp',
  host: 'smtp.example.test',
  port: 465,
  secure: true,
  user: 'buzon@example.test',
  pass: 'not-a-real-value',
  fromName: 'Archon ERP',
  fromAddress: 'buzon@example.test',
};

const MESSAGE: MailMessage = {
  to: 'destino@example.test',
  subject: 'Restablece tu contraseña — Archon ERP',
  html: '<p>Hola, contraseña con acentos: áéíóú ñ</p>',
  text: 'Hola, contraseña con acentos: áéíóú ñ',
};

function fakeMailer(sendMail: SmtpMailer['sendMail']): CreateSmtpMailer {
  return () => ({ sendMail });
}

describe('FC187 F1 — buildSmtpTransportOptions', () => {
  it('465 (secure) ⇒ TLS implícito, sin requireTLS', () => {
    const options = buildSmtpTransportOptions(CONFIG);
    expect(options).toMatchObject({
      host: CONFIG.host,
      port: 465,
      secure: true,
      requireTLS: false,
      auth: { user: CONFIG.user, pass: CONFIG.pass },
    });
  });

  it('otro puerto ⇒ secure=false y STARTTLS OBLIGATORIO (nunca texto plano)', () => {
    const options = buildSmtpTransportOptions({ ...CONFIG, port: 587, secure: false });
    expect(options).toMatchObject({ port: 587, secure: false, requireTLS: true });
  });

  it('acota los timeouts y exige TLS >= 1.2', () => {
    const options = buildSmtpTransportOptions(CONFIG);
    expect(options.connectionTimeout).toBe(10_000);
    expect(options.greetingTimeout).toBe(10_000);
    expect(options.socketTimeout).toBe(15_000);
    expect(options.tls).toEqual({ minVersion: 'TLSv1.2' });
  });
});

describe('FC187 F1 — SmtpMailTransport.send (doble inyectado)', () => {
  it('crea el cliente UNA vez con las opciones derivadas de la configuración', () => {
    const createMailer = vi.fn<CreateSmtpMailer>(() => ({ sendMail: vi.fn() }));

    // eslint-disable-next-line no-new -- solo interesa el efecto de la construcción
    new SmtpMailTransport(CONFIG, createMailer);

    expect(createMailer).toHaveBeenCalledTimes(1);
    expect(createMailer).toHaveBeenCalledWith(buildSmtpTransportOptions(CONFIG));
  });

  it('entrega con From = {nombre, buzón configurado} y responde sent con el messageId', async () => {
    const sendMail = vi.fn<SmtpMailer['sendMail']>().mockResolvedValue({ messageId: '<abc@x>' });
    const transport = new SmtpMailTransport(CONFIG, fakeMailer(sendMail));

    const result = await transport.send(MESSAGE);

    expect(result).toEqual({ status: 'sent', messageId: '<abc@x>' });
    expect(sendMail).toHaveBeenCalledWith({
      from: { name: 'Archon ERP', address: 'buzon@example.test' },
      to: MESSAGE.to,
      subject: MESSAGE.subject,
      html: MESSAGE.html,
      text: MESSAGE.text,
    });
  });

  it('incluye replyTo solo cuando está configurado', async () => {
    const sendMail = vi.fn<SmtpMailer['sendMail']>().mockResolvedValue({ messageId: '<m>' });
    const transport = new SmtpMailTransport(
      { ...CONFIG, replyTo: 'soporte@example.test' },
      fakeMailer(sendMail)
    );

    await transport.send(MESSAGE);

    const sent = sendMail.mock.calls[0][0] as SmtpSendOptions;
    expect(sent.replyTo).toBe('soporte@example.test');
  });

  it('un fallo con código se DEVUELVE como failed con solo el código (nunca lanza)', async () => {
    const error = Object.assign(new Error('535 credenciales de smtp.example.test rechazadas'), {
      code: 'EAUTH',
    });
    const transport = new SmtpMailTransport(CONFIG, fakeMailer(vi.fn().mockRejectedValue(error)));

    const result = await transport.send(MESSAGE);

    expect(result).toEqual({ status: 'failed', reason: 'EAUTH' });
    expect(JSON.stringify(result)).not.toContain('smtp.example.test');
  });

  it('un Error sin código ⇒ UNKNOWN', async () => {
    const transport = new SmtpMailTransport(
      CONFIG,
      fakeMailer(vi.fn().mockRejectedValue(new Error('boom')))
    );
    await expect(transport.send(MESSAGE)).resolves.toEqual({
      status: 'failed',
      reason: 'UNKNOWN',
    });
  });

  it('algo que no es un Error (p. ej. un string) ⇒ UNKNOWN', async () => {
    const transport = new SmtpMailTransport(
      CONFIG,
      fakeMailer(vi.fn().mockRejectedValue('texto suelto'))
    );
    await expect(transport.send(MESSAGE)).resolves.toEqual({
      status: 'failed',
      reason: 'UNKNOWN',
    });
  });
});

describe('FC187 F1 — SmtpMailTransport con el jsonTransport REAL de nodemailer (0 sockets)', () => {
  it('compone el mensaje completo: From con nombre, To, asunto/cuerpo UTF-8 y Reply-To', async () => {
    let composed: Record<string, unknown> = {};
    const createMailer: CreateSmtpMailer = () => {
      const real = nodemailer.createTransport({ jsonTransport: true });
      return {
        sendMail: async (options: SmtpSendOptions): Promise<{ messageId: string }> => {
          const info = await real.sendMail(options);
          composed = JSON.parse(info.message as string) as Record<string, unknown>;
          return { messageId: info.messageId as string };
        },
      };
    };
    const transport = new SmtpMailTransport(
      { ...CONFIG, replyTo: 'soporte@example.test' },
      createMailer
    );

    const result = await transport.send(MESSAGE);

    expect(result.status).toBe('sent');
    expect(composed.from).toEqual({ address: 'buzon@example.test', name: 'Archon ERP' });
    expect(composed.to).toEqual([{ address: 'destino@example.test', name: '' }]);
    expect(composed.replyTo).toEqual([{ address: 'soporte@example.test', name: '' }]);
    expect(composed.subject).toBe(MESSAGE.subject);
    expect(composed.html).toBe(MESSAGE.html);
    expect(composed.text).toBe(MESSAGE.text);
  });
});
