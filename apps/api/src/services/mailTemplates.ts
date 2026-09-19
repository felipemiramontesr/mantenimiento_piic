/**
 * FC187 F1 / FC188 F1 — plantillas de correo. UNA sola función (`renderActionEmail`) produce HTML
 * y texto plano desde los mismos datos: cero duplicación entre las dos versiones ni entre
 * plantillas. Las URLs las construye el servidor (FRONTEND_URL + token), nunca vienen del usuario;
 * aun así todo se escapa en el HTML.
 */

/** Contenido listo para enviar (sin destinatario). */
export interface EmailContent {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

interface EmailAction {
  readonly label: string;
  readonly url: string;
}

interface ActionEmailSpec {
  readonly subject: string;
  readonly heading: string;
  readonly intro: string;
  /** Sin `action` el correo es solo informativo (p. ej. el de prueba del sistema). */
  readonly action?: EmailAction;
  readonly notes: readonly string[];
}

const BRAND = 'Archon ERP';
const NAVY = '#0F2A44';
const YELLOW = '#F2B705';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderActionHtml(action: EmailAction): string {
  const url = escapeHtml(action.url);
  return (
    `<p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:${YELLOW};` +
    `color:${NAVY};text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:4px;">` +
    `${escapeHtml(action.label)}</a></p>` +
    `<p style="margin:0 0 16px;font-size:13px;color:#5b6b7b;">Si el botón no funciona, copia este ` +
    `enlace en tu navegador:<br><span style="word-break:break-all;">${url}</span></p>`
  );
}

function renderHtmlBody(spec: ActionEmailSpec): string {
  const notes = spec.notes
    .map((n) => `<p style="margin:0 0 8px;font-size:13px;color:#5b6b7b;">${escapeHtml(n)}</p>`)
    .join('');
  return (
    `<h1 style="margin:0 0 12px;font-size:22px;color:${NAVY};">${escapeHtml(spec.heading)}</h1>` +
    `<p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:${NAVY};">${escapeHtml(
      spec.intro
    )}</p>` +
    `${spec.action ? renderActionHtml(spec.action) : ''}${notes}`
  );
}

function renderHtml(spec: ActionEmailSpec): string {
  return (
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    `<title>${escapeHtml(spec.subject)}</title></head>` +
    '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
    'style="background:#f4f5f7;padding:24px 0;"><tr><td align="center">' +
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" ' +
    'style="max-width:560px;background:#ffffff;border-radius:6px;overflow:hidden;">' +
    `<tr><td style="background:${NAVY};padding:20px 28px;color:#ffffff;font-size:20px;` +
    `font-weight:bold;letter-spacing:0.5px;">${BRAND}</td></tr>` +
    `<tr><td style="padding:28px;">${renderHtmlBody(spec)}</td></tr>` +
    '</table></td></tr></table></body></html>'
  );
}

function renderText(spec: ActionEmailSpec): string {
  const actionLine = spec.action ? [`${spec.action.label}: ${spec.action.url}`] : [];
  return [BRAND, spec.heading, spec.intro, ...actionLine, ...spec.notes].join('\n\n');
}

function renderActionEmail(spec: ActionEmailSpec): EmailContent {
  return { subject: spec.subject, html: renderHtml(spec), text: renderText(spec) };
}

/** Correo de recuperación de contraseña (F3 lo envía; TTL de 15 min por FC187). */
export function buildPasswordResetEmail(resetUrl: string): EmailContent {
  return renderActionEmail({
    subject: `Restablece tu contraseña — ${BRAND}`,
    heading: 'Restablece tu contraseña',
    intro:
      'Recibimos una solicitud para restablecer la contraseña de tu cuenta. ' +
      'Usa el botón para elegir una nueva.',
    action: { label: 'Restablecer contraseña', url: resetUrl },
    notes: [
      'Este enlace caduca en 15 minutos y solo puede usarse una vez.',
      'Si no lo solicitaste, ignora este mensaje: tu contraseña no cambiará.',
    ],
  });
}

/** Correo de verificación de dirección de correo (F5 lo envía al registrarse). */
export function buildEmailVerificationEmail(verifyUrl: string): EmailContent {
  return renderActionEmail({
    subject: `Verifica tu correo — ${BRAND}`,
    heading: 'Verifica tu correo electrónico',
    intro: 'Confirma que esta dirección te pertenece para completar tu registro en Archon.',
    action: { label: 'Verificar correo', url: verifyUrl },
    notes: [
      'No compartas este enlace con nadie.',
      'Si no creaste una cuenta, ignora este mensaje.',
    ],
  });
}

/** Datos del correo de prueba: quién lo disparó, cuándo (ISO UTC) y con qué transporte. */
export interface MailTestEmailParams {
  readonly actorName: string;
  readonly sentAtIso: string;
  readonly mode: string;
}

/** Correo de diagnóstico de Ω (FC188): informativo, sin botón ni enlace. */
export function buildMailTestEmail(params: MailTestEmailParams): EmailContent {
  return renderActionEmail({
    subject: '[ARCHON] Correo de prueba del sistema',
    heading: 'Correo de prueba del sistema',
    intro:
      'Este mensaje confirma que el correo transaccional de Archon está funcionando: ' +
      'las variables de entorno, la autenticación SMTP y la entrega.',
    notes: [
      `Disparado por ${params.actorName} el ${params.sentAtIso} (UTC).`,
      `Transporte activo: ${params.mode}.`,
      'Si no esperabas este mensaje, ignóralo.',
    ],
  });
}
