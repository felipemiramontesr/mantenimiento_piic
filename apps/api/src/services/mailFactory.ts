import nodemailer from 'nodemailer';
import type { MailConfig } from './mailConfig';
import { MemoryMailTransport, disabledMailTransport } from './mailTransport';
import type { MailTransport } from './mailTransport';
import { SmtpMailTransport } from './smtpMailTransport';

/**
 * FC187 F1 — único punto que conoce a `nodemailer`. Convierte la `MailConfig` (ya resuelta por
 * `loadMailConfig`) en el transporte concreto y emite el estado del correo en el log de arranque
 * — exclusivamente ahí: `/health` NO expone si el correo está configurado (D1).
 */

/** Crea el transporte que corresponde al modo de la configuración. */
export function createMailTransport(config: MailConfig): MailTransport {
  if (config.mode === 'smtp') {
    return new SmtpMailTransport(config, (options) => nodemailer.createTransport(options));
  }
  if (config.mode === 'memory') return new MemoryMailTransport();
  return disabledMailTransport;
}

/** Lo mínimo que se necesita de un logger (el de Fastify lo cumple). */
export interface MailStatusLogger {
  info(message: string): void;
  warn(message: string): void;
}

/**
 * Registra el estado del correo al arrancar. Sin SMTP usable es una ADVERTENCIA visible en los
 * Runtime logs de Hostinger, no un fallo: el API arranca y el login no se ve afectado. Solo
 * host/puerto/modo TLS; nunca usuario ni contraseña.
 */
export function logMailStatus(log: MailStatusLogger, config: MailConfig): void {
  if (config.mode === 'smtp') {
    const tls = config.secure ? 'TLS implícito' : 'STARTTLS';
    log.info(`📧 [Archon Mail] SMTP activo · ${config.host}:${config.port} · ${tls}`);
    return;
  }
  if (config.mode === 'memory') {
    log.info('📧 [Archon Mail] Transporte en memoria (test) · 0 sockets');
    return;
  }
  log.warn(
    `📧 [Archon Mail] Correo DESACTIVADO (${config.reason}). ` +
      'Recuperación de contraseña y verificación no enviarán mensajes.'
  );
}
