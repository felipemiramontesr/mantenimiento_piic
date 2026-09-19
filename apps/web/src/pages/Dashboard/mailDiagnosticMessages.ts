import { isAxiosError } from 'axios';

/**
 * FC188 F2 — mensajes del Diagnóstico de Correo del Sistema. Lógica pura (sin React ni red): traduce
 * la respuesta de `POST /v1/cosmology/mail/test` (y sus errores HTTP) a un texto orientativo para
 * Ω. El API nunca devuelve host, usuario ni contraseña; solo un código (`EAUTH`, `ETIMEDOUT`…).
 */

export type MailMode = 'smtp' | 'memory' | 'disabled';

/** Cuerpo 200 de `POST /cosmology/mail/test`. Un fallo de SMTP también es 200 con `status: 'failed'`. */
export interface MailTestResponse {
  success: boolean;
  mode: MailMode;
  status: 'sent' | 'failed' | 'disabled';
  reason?: string;
  messageId?: string;
}

export type MailTestTone = 'success' | 'warning' | 'error';

/** Lo que la tarjeta muestra tras un envío. `mode` solo viene cuando el API llegó a responder 200. */
export interface MailTestOutcome {
  tone: MailTestTone;
  message: string;
  mode?: MailMode;
}

const FALLBACK_RECIPIENT = 'tu correo registrado';

/** Códigos de nodemailer que significan "no se pudo llegar al servidor SMTP". */
const CONNECTION_CODES: ReadonlySet<string> = new Set([
  'ETIMEDOUT',
  'ESOCKET',
  'ECONNECTION',
  'ECONNREFUSED',
  'EDNS',
]);

/** `felipe@gmail.com` → `fe•••@gmail.com`. Sin correo o con forma inválida, un texto genérico. */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return FALLBACK_RECIPIENT;
  const at = email.lastIndexOf('@');
  if (at < 1) return FALLBACK_RECIPIENT;
  return `${email.slice(0, Math.min(2, at))}•••${email.slice(at)}`;
}

function describeFailure(reason: string | undefined): MailTestOutcome {
  if (reason === 'EAUTH') {
    return {
      tone: 'error',
      message:
        'Fallo de autenticación SMTP — verifica el usuario y contraseña del buzón en Hostinger',
    };
  }
  if (reason !== undefined && CONNECTION_CODES.has(reason)) {
    return {
      tone: 'error',
      message: 'Error de conexión — verifica el host y puerto SMTP en Hostinger',
    };
  }
  return {
    tone: 'error',
    message: `El servidor de correo rechazó el envío (código: ${reason ?? 'desconocido'})`,
  };
}

function describeSent(mode: MailMode, maskedEmail: string): MailTestOutcome {
  if (mode === 'memory') {
    return {
      tone: 'warning',
      message:
        'Modo memoria: el correo se registró internamente y NO salió a ningún buzón (solo pruebas)',
    };
  }
  return {
    tone: 'success',
    message: `Correo de prueba enviado a ${maskedEmail} — revisa tu bandeja de entrada y spam`,
  };
}

/** Traduce una respuesta 200 del diagnóstico (`sent` / `failed` / `disabled`) a un mensaje. */
export function describeMailTestResult(
  response: MailTestResponse,
  maskedEmail: string
): MailTestOutcome {
  let outcome: MailTestOutcome;
  if (response.status === 'sent') {
    outcome = describeSent(response.mode, maskedEmail);
  } else if (response.status === 'disabled') {
    outcome = {
      tone: 'warning',
      message: 'El correo transaccional está desactivado (faltan variables SMTP_* en el panel)',
    };
  } else {
    outcome = describeFailure(response.reason);
  }
  return { ...outcome, mode: response.mode };
}

/** Estado y código del error HTTP (`400 EMAIL_NOT_CONFIGURED`, `429 RATE_LIMIT_EXCEEDED`…). */
function readRequestFailure(error: unknown): { status: number | null; code: string | null } {
  if (!isAxiosError<{ code?: string }>(error)) return { status: null, code: null };
  return { status: error.response?.status ?? null, code: error.response?.data?.code ?? null };
}

/** Traduce un error de la petición (400 sin correo, 429 límite, red caída, 5xx) a un mensaje. */
export function describeMailTestRequestError(error: unknown): MailTestOutcome {
  const { status, code } = readRequestFailure(error);
  if (code === 'EMAIL_NOT_CONFIGURED') {
    return {
      tone: 'error',
      message: 'La cuenta de Omega no tiene un correo configurado para recibir pruebas',
    };
  }
  if (status === 429) {
    return {
      tone: 'warning',
      message: 'Límite de 3 correos de prueba por hora alcanzado — intenta de nuevo más tarde',
    };
  }
  return {
    tone: 'error',
    message: 'No se pudo completar la prueba — verifica la conexión con el API e intenta de nuevo',
  };
}
