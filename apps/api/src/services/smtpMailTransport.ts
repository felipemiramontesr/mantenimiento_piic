import type { SmtpMailConfig } from './mailConfig';
import type { MailMessage, MailSendResult, MailTransport } from './mailTransport';

/**
 * FC187 F1 — transporte SMTP (Hostinger). No importa `nodemailer`: recibe la función que crea el
 * cliente (`CreateSmtpMailer`), así los tests inyectan un doble o el `jsonTransport` real de
 * nodemailer y NUNCA se abre un socket (R10). El cableado real vive en `mailFactory.ts`.
 */

const CONNECTION_TIMEOUT_MS = 10_000;
const GREETING_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 15_000;

/** Opciones de conexión. La exigencia de TLS (`requireTLS`) la fija `mailFactory.ts` en el punto de llamada. */
export interface SmtpTransportOptions {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly auth: { readonly user: string; readonly pass: string };
  readonly connectionTimeout: number;
  readonly greetingTimeout: number;
  readonly socketTimeout: number;
  readonly tls: { readonly minVersion: 'TLSv1.2' };
}

/** Lo que se le pide a nodemailer en cada envío. */
export interface SmtpSendOptions {
  readonly from: { readonly name: string; readonly address: string };
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  readonly replyTo?: string;
}

/** La parte de un `Transporter` de nodemailer que usamos. */
export interface SmtpMailer {
  sendMail(options: SmtpSendOptions): Promise<{ messageId: string }>;
}

/** Fábrica del cliente SMTP (en producción, `nodemailer.createTransport`). */
export type CreateSmtpMailer = (options: SmtpTransportOptions) => SmtpMailer;

/** Deriva las opciones de conexión: `secure` (465) ⇒ TLS implícito; otro puerto ⇒ STARTTLS (exigido en la fábrica). */
export function buildSmtpTransportOptions(config: SmtpMailConfig): SmtpTransportOptions {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
    tls: { minVersion: 'TLSv1.2' },
  };
}

/** Código del error (`EAUTH`, `ETIMEDOUT`…) o `UNKNOWN`; nunca el mensaje. */
function errorCode(error: unknown): string {
  const code = error instanceof Error ? (error as { code?: string }).code : undefined;
  return code ?? 'UNKNOWN';
}

/** Envía por SMTP con `From` = buzón configurado. Un fallo se DEVUELVE, no se lanza. */
export class SmtpMailTransport implements MailTransport {
  private readonly config: SmtpMailConfig;

  private readonly mailer: SmtpMailer;

  constructor(config: SmtpMailConfig, createMailer: CreateSmtpMailer) {
    this.config = config;
    this.mailer = createMailer(buildSmtpTransportOptions(config));
  }

  /** Entrega el mensaje; `failed` lleva solo el código del error. */
  async send(message: MailMessage): Promise<MailSendResult> {
    try {
      const info = await this.mailer.sendMail({
        from: { name: this.config.fromName, address: this.config.fromAddress },
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(this.config.replyTo === undefined ? {} : { replyTo: this.config.replyTo }),
      });
      return { status: 'sent', messageId: info.messageId };
    } catch (error) {
      return { status: 'failed', reason: errorCode(error) };
    }
  }
}
