/**
 * 🔱 FC 062 F3 — A09_Security_Logging.
 * Logger estructurado de eventos de seguridad (JSON de una línea, sin PII — §8.1)
 * + contadores en memoria expuestos en /metrics (formato Prometheus mínimo —
 * L §12 parcial, limitación declarada: sin OTel distribuido ni percentiles).
 */

export type SecurityEventType =
  | 'AUTH_FAILURE'
  | 'ACCESS_DENIED'
  | 'PANIC_SOS'
  | 'RATE_LIMIT'
  | 'LOCK_EXPROPRIATION'
  | 'SSRF_BLOCKED';

export interface SecurityEvent {
  event: SecurityEventType;
  route: string;
  method?: string;
  actorId?: number;
  ip?: string;
  statusCode?: number;
  detail?: Record<string, unknown>;
}

export type LogSink = (line: string) => void;

// §8.1 — campos cifrados/PII que jamás aparecen en logs (ni como clave ni como valor)
const PII_KEYS = new Set([
  'placas',
  'numeroserie',
  'numero_serie',
  'circulationcardnumber',
  'circulation_card_number',
  'email',
  'telefono',
  'phone',
  'password',
  'password_hash',
  'token',
  'authorization',
  'username',
  'full_name',
  'fullname',
]);

const httpResponses = new Map<number, number>();
const securityEvents = new Map<SecurityEventType, number>();

const defaultSink: LogSink = (line) => {
  process.stdout.write(line);
};

export function sanitizeDetail(detail: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(detail).filter(([key]) => !PII_KEYS.has(key.toLowerCase()))
  );
}

export function logSecurityEvent(event: SecurityEvent, sink: LogSink = defaultSink): void {
  securityEvents.set(event.event, (securityEvents.get(event.event) ?? 0) + 1);
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level: 'SECURITY',
    event: event.event,
    route: event.route,
  };
  if (event.method !== undefined) payload.method = event.method;
  if (event.actorId !== undefined) payload.actorId = event.actorId;
  if (event.ip !== undefined) payload.ip = event.ip;
  if (event.statusCode !== undefined) payload.statusCode = event.statusCode;
  if (event.detail !== undefined) payload.detail = sanitizeDetail(event.detail);
  sink(`${JSON.stringify(payload)}\n`);
}

export function recordHttpResponse(statusCode: number): void {
  httpResponses.set(statusCode, (httpResponses.get(statusCode) ?? 0) + 1);
}

export function renderPrometheusMetrics(): string {
  const lines: string[] = [
    '# HELP archon_http_responses_total Respuestas HTTP del API por código de estado.',
    '# TYPE archon_http_responses_total counter',
  ];
  [...httpResponses.entries()]
    .sort(([a], [b]) => a - b)
    .forEach(([code, count]) => {
      lines.push(`archon_http_responses_total{code="${code}"} ${count}`);
    });
  lines.push(
    '# HELP archon_security_events_total Eventos de seguridad registrados por tipo.',
    '# TYPE archon_security_events_total counter'
  );
  [...securityEvents.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([event, count]) => {
      lines.push(`archon_security_events_total{event="${event}"} ${count}`);
    });
  return `${lines.join('\n')}\n`;
}

export function resetSecurityMetrics(): void {
  httpResponses.clear();
  securityEvents.clear();
}
