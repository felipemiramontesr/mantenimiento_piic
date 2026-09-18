/**
 * FC187 F1 — contrato del transporte de correo y sus dos implementaciones sin red. La
 * implementación SMTP vive en `smtpMailTransport.ts` (una clase por archivo). Cambiar de proveedor
 * (Resend/SES) = una implementación nueva de `MailTransport`, sin tocar a quien envía correos.
 */

/** Un mensaje ya renderizado (HTML + texto plano de la MISMA plantilla). */
export interface MailMessage {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

/**
 * Resultado de `send` — NUNCA lanza. `failed.reason` es solo un código (p. ej. `EAUTH`,
 * `ETIMEDOUT`), jamás el texto del error, que podría contener host o usuario.
 */
export type MailSendResult =
  | { readonly status: 'sent'; readonly messageId: string }
  | { readonly status: 'disabled' }
  | { readonly status: 'failed'; readonly reason: string };

/** Transporte de correo intercambiable. */
export interface MailTransport {
  send(message: MailMessage): Promise<MailSendResult>;
}

/** Para tests: guarda los mensajes en memoria, 0 sockets (R10). */
export class MemoryMailTransport implements MailTransport {
  private readonly sent: MailMessage[] = [];

  /** Mensajes enviados, en orden. */
  get outbox(): readonly MailMessage[] {
    return this.sent;
  }

  /** Registra el mensaje y responde `sent`. */
  send(message: MailMessage): Promise<MailSendResult> {
    this.sent.push(message);
    return Promise.resolve({ status: 'sent', messageId: `memory-${this.sent.length}` });
  }

  /** Vacía la cola entre tests. */
  reset(): void {
    this.sent.length = 0;
  }
}

/** Sin SMTP usable: no envía nada y lo dice, sin lanzar. */
export const disabledMailTransport: MailTransport = {
  send: (): Promise<MailSendResult> => Promise.resolve({ status: 'disabled' }),
};
