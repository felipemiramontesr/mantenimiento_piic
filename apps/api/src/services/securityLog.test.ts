import { describe, it, expect, beforeEach } from 'vitest';

import {
  logSecurityEvent,
  recordHttpResponse,
  renderPrometheusMetrics,
  resetSecurityMetrics,
  sanitizeDetail,
} from './securityLog';

/**
 * 🔱 FC 062 F3 — A09_Security_Logging (Scenario 3)
 * Structured one-line JSON security events without PII (§8.1) and
 * minimal Prometheus counters (L §12 — declared partial scope).
 */

describe('FC062-F3 — securityLog unit', () => {
  beforeEach(() => {
    resetSecurityMetrics();
  });

  it('A09-1: emits a single-line JSON event with {ts, event, route, actorId, ip}', () => {
    const lines: string[] = [];
    logSecurityEvent(
      {
        event: 'AUTH_FAILURE',
        route: '/v1/security/panic',
        method: 'POST',
        actorId: 7,
        ip: '10.0.0.9',
        statusCode: 401,
      },
      (line) => lines.push(line)
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].endsWith('\n')).toBe(true);
    expect(lines[0].slice(0, -1)).not.toContain('\n'); // one physical line
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(parsed.event).toBe('AUTH_FAILURE');
    expect(parsed.route).toBe('/v1/security/panic');
    expect(parsed.actorId).toBe(7);
    expect(parsed.ip).toBe('10.0.0.9');
    expect(parsed.statusCode).toBe(401);
    expect(typeof parsed.ts).toBe('string');
    expect(Number.isNaN(Date.parse(parsed.ts as string))).toBe(false);
  });

  it('A09-2 (§8.1): sanitizeDetail strips PII keys and keeps operational keys', () => {
    const clean = sanitizeDetail({
      placas: 'ABC-123',
      numeroSerie: '1FTFW1ET5DFC10312',
      circulationCardNumber: 'TC-99',
      email: 'user@piic.mx',
      password_hash: 'h',
      token: 'jwt',
      unitId: 'U-42',
      notifiedCount: 3,
    });
    expect(clean).toEqual({ unitId: 'U-42', notifiedCount: 3 });
  });

  it('A09-3: event detail is sanitized before emission — PII never reaches the line', () => {
    const lines: string[] = [];
    logSecurityEvent(
      {
        event: 'PANIC_SOS',
        route: '/v1/security/panic',
        actorId: 1,
        detail: { placas: 'XYZ-999', notifiedCount: 5 },
      },
      (line) => lines.push(line)
    );
    expect(lines[0]).not.toContain('XYZ-999');
    expect(lines[0]).not.toContain('placas');
    expect(lines[0]).toContain('notifiedCount');
  });

  it('A09-4: counters — http responses by code and security events by type', () => {
    recordHttpResponse(200);
    recordHttpResponse(200);
    recordHttpResponse(401);
    logSecurityEvent({ event: 'AUTH_FAILURE', route: '/x' }, () => undefined);
    logSecurityEvent({ event: 'RATE_LIMIT', route: '/y' }, () => undefined);
    const metrics = renderPrometheusMetrics();
    expect(metrics).toContain('archon_http_responses_total{code="200"} 2');
    expect(metrics).toContain('archon_http_responses_total{code="401"} 1');
    expect(metrics).toContain('archon_security_events_total{event="AUTH_FAILURE"} 1');
    expect(metrics).toContain('archon_security_events_total{event="RATE_LIMIT"} 1');
  });

  it('A09-5: prometheus exposition includes HELP/TYPE headers and resets cleanly', () => {
    recordHttpResponse(500);
    let metrics = renderPrometheusMetrics();
    expect(metrics).toContain('# HELP archon_http_responses_total');
    expect(metrics).toContain('# TYPE archon_http_responses_total counter');
    expect(metrics).toContain('# HELP archon_security_events_total');
    expect(metrics).toContain('# TYPE archon_security_events_total counter');
    resetSecurityMetrics();
    metrics = renderPrometheusMetrics();
    expect(metrics).not.toContain('archon_http_responses_total{');
    expect(metrics).not.toContain('archon_security_events_total{');
  });

  it('A09-6: default sink writes to stdout without throwing (smoke)', () => {
    expect(() => logSecurityEvent({ event: 'LOCK_EXPROPRIATION', route: 'n/a' })).not.toThrow();
  });
});
