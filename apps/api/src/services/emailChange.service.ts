import EncryptionService from './encryption';
import { maskEmail } from './emailMfa.service';
import { buildEmailChangedNotice } from './mailTemplates';
import { recordAuditLog } from './auditService';
import type { MailTransport } from './mailTransport';

/**
 * FC196 F2 — cambio del correo de un usuario (PATCH /users/:id, MU u Ω). Detecta si el correo
 * cambió de verdad y, después del commit, avisa al buzón ANTERIOR. El reinicio de la verificación
 * y del 2FA por correo vive en `mfa.repository.ts::resetEmailFactor` (misma transacción que el
 * cambio, Invariante 3). El aviso nunca revierte ni bloquea el cambio (Invariante 4).
 */

/** El correo antes (descifrado; `null` si no tenía) y el nuevo. */
export interface EmailChange {
  readonly previous: string | null;
  readonly next: string;
}

function sameAddress(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** `null` si el PATCH no trae correo o trae el mismo (sin distinguir mayúsculas ni espacios). El
 *  correo guardado viene cifrado: se compara contra el descifrado. */
export function detectEmailChange(
  storedEmail: unknown,
  nextEmail: string | undefined
): EmailChange | null {
  if (!nextEmail) return null;
  const previous =
    typeof storedEmail === 'string' && storedEmail ? EncryptionService.decrypt(storedEmail) : null;
  if (previous !== null && sameAddress(previous, nextEmail)) return null;
  return { previous, next: nextEmail };
}

/** Resultado del aviso: `skipped` si no había correo anterior al que avisar. */
export type EmailChangeNoticeStatus = 'sent' | 'failed' | 'disabled' | 'skipped';

export interface EmailChangeNoticeInput {
  readonly transport: MailTransport;
  readonly change: EmailChange;
  readonly targetUserId: number;
  readonly adminId: number;
  readonly now?: Date;
}

/** Avisa al buzón anterior y deja rastro en la auditoría (solo el resultado, nunca el contenido).
 *  NUNCA lanza: cualquier fallo (SMTP o auditoría) se reporta como `failed` para que la ruta lo
 *  registre como advertencia sin afectar la respuesta. */
export async function notifyPreviousAddress(
  input: EmailChangeNoticeInput
): Promise<EmailChangeNoticeStatus> {
  const { change } = input;
  if (!change.previous) return 'skipped';
  try {
    const content = buildEmailChangedNotice({
      maskedNewEmail: maskEmail(change.next),
      changedAtIso: (input.now ?? new Date()).toISOString(),
      changedByUserId: input.adminId,
    });
    const sent = await input.transport.send({ to: change.previous, ...content });
    await recordAuditLog({
      entity_type: 'user',
      entity_id: String(input.targetUserId),
      action: 'UPDATE',
      snapshot_after: { emailChangeNotice: sent.status },
      reason: 'FC196 F2 — aviso de cambio de correo al buzón anterior',
      user_id: input.adminId,
    });
    return sent.status;
  } catch {
    return 'failed';
  }
}
