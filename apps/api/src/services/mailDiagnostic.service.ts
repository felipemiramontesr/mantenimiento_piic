import * as MailDiagnosticRepository from './mailDiagnostic.repository';
import EncryptionService from './encryption';
import { recordAuditLog } from './auditService';
import { buildMailTestEmail } from './mailTemplates';
import type { MailConfig } from './mailConfig';
import type { MailTransport } from './mailTransport';

/**
 * FC188 F1 — System_Mail_Diagnostic_Test. Lógica de `POST /v1/cosmology/mail/test`: envía UN
 * correo de prueba al correo REGISTRADO de la cuenta que lo pide. El destinatario nunca viene del
 * request (anti-relay, invariante 1): se descifra de `users.email`.
 */

/** Resultado del diagnóstico. El fallo de SMTP es un RESULTADO (`status: 'failed'`), no un error. */
export type MailTestResult =
  | {
      ok: true;
      mode: MailConfig['mode'];
      status: 'sent' | 'failed' | 'disabled';
      reason?: string;
      messageId?: string;
    }
  | { ok: false; status: 400; code: 'EMAIL_NOT_CONFIGURED'; message: string };

/** Datos de una petición de prueba; `sentAt` lo fija el llamador (el servicio no lee el reloj). */
export interface MailTestInput {
  userId: number;
  mode: MailConfig['mode'];
  transport: MailTransport;
  sentAt: Date;
}

const NO_EMAIL: MailTestResult = {
  ok: false,
  status: 400,
  code: 'EMAIL_NOT_CONFIGURED',
  message: 'La cuenta no tiene un correo configurado para recibir la prueba',
};

/**
 * Envía el correo de prueba al correo de `userId` por `transport` y deja rastro de auditoría
 * (actor, modo y resultado; jamás el contenido ni credenciales). Sin correo registrado ⇒
 * `EMAIL_NOT_CONFIGURED`, sin enviar ni auditar.
 */
export async function sendMailTest(input: MailTestInput): Promise<MailTestResult> {
  const contact = await MailDiagnosticRepository.findUserContactById(input.userId);
  if (!contact?.email) return NO_EMAIL;

  const content = buildMailTestEmail({
    actorName: contact.username,
    sentAtIso: input.sentAt.toISOString(),
    mode: input.mode,
  });
  const sent = await input.transport.send({
    to: EncryptionService.decrypt(contact.email),
    ...content,
  });

  const result: MailTestResult = {
    ok: true,
    mode: input.mode,
    status: sent.status,
    ...(sent.status === 'failed' ? { reason: sent.reason } : {}),
    ...(sent.status === 'sent' ? { messageId: sent.messageId } : {}),
  };
  await recordAuditLog({
    entity_type: 'system_mail_test',
    entity_id: String(input.userId),
    action: 'CREATE',
    snapshot_after: { mode: result.mode, status: result.status, reason: result.reason },
    reason: 'SOVEREIGN_MAIL_TEST_DISPATCHED',
    user_id: input.userId,
  });
  return result;
}
