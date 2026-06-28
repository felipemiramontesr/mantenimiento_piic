import { describe, it, expect } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import requirePermission from '../middleware/requirePermission';

/**
 * AT-FC18-D3: Route Hardening — FC-18 FaseD-3
 * Verifies granular slug enforcement and backward compatibility for hardened routes.
 *
 * Gherkin mapping (from FC-18 §8):
 *   RH-1: Exact granular slug passes on hardened route
 *   RH-2: Legacy slug in JWT still passes hardened granular route (backward compat window)
 *   RH-3: Legacy fleet:view does NOT grant access to intelligence routes (no alias path)
 */

type MockReply = {
  statusCode: number;
  responseBody: unknown;
  code(c: number): MockReply;
  send(b: unknown): MockReply;
};

function makeRequest(permissions: string[]): FastifyRequest {
  return { user: { id: 1, permissions } } as unknown as FastifyRequest;
}

function makeReply(): MockReply {
  const reply: MockReply = {
    statusCode: 200,
    responseBody: null,
    code(c: number): MockReply {
      reply.statusCode = c;
      return reply;
    },
    send(b: unknown): MockReply {
      reply.responseBody = b;
      return reply;
    },
  };
  return reply;
}

describe('FC-18 FaseD-3 — Route Hardening (AT-FC18-D3-RH)', () => {
  // AT-FC18-D3-RH-1
  // Given a user with granular slug fleet:unit:view:any
  // When the hardened fleet route enforces requirePermission('fleet:unit:view:any')
  // Then the request passes (no 403)
  it('AT-FC18-D3-RH-1 — granular fleet:unit:view:any in JWT passes hardened fleet route', async () => {
    const reply = makeReply();
    const guard = requirePermission('fleet:unit:view:any');
    await guard(makeRequest(['fleet:unit:view:any']), reply as unknown as FastifyReply);
    expect(reply.statusCode).toBe(200);
    expect(reply.responseBody).toBeNull();
  });

  // AT-FC18-D3-RH-2
  // Given a user whose JWT still carries the legacy fleet:view slug (token not yet rotated)
  // When the hardened fleet route enforces requirePermission('fleet:unit:view:any')
  // Then the request passes via LEGACY_ALIASES backward-compat resolution
  it('AT-FC18-D3-RH-2 — legacy fleet:view JWT passes hardened fleet:unit:view:any route (compat window)', async () => {
    const reply = makeReply();
    const guard = requirePermission('fleet:unit:view:any');
    await guard(makeRequest(['fleet:view']), reply as unknown as FastifyReply);
    expect(reply.statusCode).toBe(200);
    expect(reply.responseBody).toBeNull();
  });

  // AT-FC18-D3-RH-3
  // Given a user with only the legacy fleet:view slug
  // When an intelligence route enforces requirePermission('intelligence:anomaly:view')
  // Then the request is rejected with 403 FORBIDDEN
  // (fleet:view aliases to fleet:unit:view:any, NOT to intelligence:anomaly:view)
  it('AT-FC18-D3-RH-3 — legacy fleet:view JWT is REJECTED by intelligence:anomaly:view route (no alias path)', async () => {
    const reply = makeReply();
    const guard = requirePermission('intelligence:anomaly:view');
    await guard(makeRequest(['fleet:view']), reply as unknown as FastifyReply);
    expect(reply.statusCode).toBe(403);
    expect((reply.responseBody as { code: string }).code).toBe('FORBIDDEN');
  });
});
