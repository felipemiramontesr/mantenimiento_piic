import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import requirePermission, { LEGACY_ALIASES } from './requirePermission';

/**
 * AT-FC18-D2: requirePermission — FC-18 FaseD-2
 * Unit tests — no HTTP server, direct request/reply mocks.
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

describe('FC-18 FaseD-2 — requirePermission (AT-FC18-D2-RP)', () => {
  let reply: MockReply;

  beforeEach(() => {
    reply = makeReply();
  });

  // AT-FC18-D2-RP-1: Archon (*) bypasses all permission checks
  it('AT-FC18-D2-RP-1 — Archon (*) bypasses all checks', async () => {
    const guard = requirePermission('fleet:unit:view:any');
    await guard(makeRequest(['*']), reply as unknown as FastifyReply);
    expect(reply.statusCode).toBe(200);
    expect(reply.responseBody).toBeNull();
  });

  // AT-FC18-D2-RP-2: Exact granular slug match passes
  it('AT-FC18-D2-RP-2 — exact granular slug passes', async () => {
    const guard = requirePermission('fleet:unit:view:any');
    await guard(
      makeRequest(['fleet:unit:view:any', 'maint:view']),
      reply as unknown as FastifyReply
    );
    expect(reply.responseBody).toBeNull();
  });

  // AT-FC18-D2-RP-3: Missing permission returns 403
  it('AT-FC18-D2-RP-3 — missing permission returns 403 FORBIDDEN', async () => {
    const guard = requirePermission('fleet:unit:view:any');
    await guard(makeRequest(['maint:view']), reply as unknown as FastifyReply);
    expect(reply.statusCode).toBe(403);
    expect((reply.responseBody as { code: string }).code).toBe('FORBIDDEN');
  });

  // AT-FC18-D2-RP-4: Legacy slug in JWT passes check for granular slug (backward compat)
  it('AT-FC18-D2-RP-4 — legacy fleet:view in JWT satisfies requirePermission("fleet:unit:view:any")', async () => {
    const guard = requirePermission('fleet:unit:view:any');
    await guard(makeRequest(['fleet:view']), reply as unknown as FastifyReply);
    expect(reply.statusCode).toBe(200);
    expect(reply.responseBody).toBeNull();
  });

  // AT-FC18-D2-RP-5: Legacy slug in route, granular in JWT also passes
  it('AT-FC18-D2-RP-5 — requirePermission("fleet:view") passes with granular fleet:unit:view:any in JWT', async () => {
    const guard = requirePermission('fleet:view');
    await guard(makeRequest(['fleet:unit:view:any']), reply as unknown as FastifyReply);
    expect(reply.responseBody).toBeNull();
  });

  // AT-FC18-D2-RP-6: All legacy aliases are defined (table completeness)
  it('AT-FC18-D2-RP-6 — LEGACY_ALIASES contains all expected legacy slugs', () => {
    const expectedLegacy = [
      'fleet:view',
      'fleet:write',
      'fleet:delete',
      'maint:view',
      'maint:write',
      'route:view',
      'route:write',
      'financial:view',
      'financial:write',
      'financial:report',
      'report:export',
      'user:admin',
      'system:manage_roles',
    ];
    expectedLegacy.forEach((slug) => {
      expect(LEGACY_ALIASES).toHaveProperty(slug);
    });
  });

  // AT-FC18-D2-RP-7: Client Externo (portal only) cannot access fleet endpoint
  it('AT-FC18-D2-RP-7 — portal-only JWT returns 403 for fleet:unit:view:any', async () => {
    const guard = requirePermission('fleet:unit:view:any');
    await guard(
      makeRequest(['portal:dashboard:view', 'notifications:view:own']),
      reply as unknown as FastifyReply
    );
    expect(reply.statusCode).toBe(403);
  });

  // AT-FC18-D2-RP-8: Old JWT with legacy slug still passes old-style requirePermission call
  it('AT-FC18-D2-RP-8 — requirePermission("fleet:view") with fleet:view JWT passes', async () => {
    const guard = requirePermission('fleet:view');
    await guard(makeRequest(['fleet:view']), reply as unknown as FastifyReply);
    expect(reply.responseBody).toBeNull();
  });

  // AT-FC18-D2-RP-9: Empty permissions → 403
  it('AT-FC18-D2-RP-9 — empty permissions array returns 403', async () => {
    const guard = requirePermission('fleet:unit:view:any');
    await guard(makeRequest([]), reply as unknown as FastifyReply);
    expect(reply.statusCode).toBe(403);
  });

  // AT-FC18-D2-RP-10: user:admin legacy alias maps to admin:role:edit
  it('AT-FC18-D2-RP-10 — user:admin alias resolves to admin:role:edit', async () => {
    expect(LEGACY_ALIASES['user:admin']).toBe('admin:role:edit');
    const guard = requirePermission('user:admin');
    await guard(makeRequest(['admin:role:edit']), reply as unknown as FastifyReply);
    expect(reply.responseBody).toBeNull();
  });

  // AT-FC18-D2-RP-11: Passing permission never calls reply.send
  it('AT-FC18-D2-RP-11 — passing permission never calls reply.send', async () => {
    const mockSend = vi.fn();
    const mockCode = vi.fn().mockReturnThis();
    const mockReply = { send: mockSend, code: mockCode } as unknown as FastifyReply;
    const guard = requirePermission('intelligence:recall:view');
    await guard(makeRequest(['intelligence:recall:view']), mockReply);
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockCode).not.toHaveBeenCalled();
  });
});
