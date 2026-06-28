import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import db from '../services/db';
import requireOwnership from './requireOwnership';

/**
 * AT-FC18-D2: requireOwnership — FC-18 FaseD-2
 * Unit tests — DB mocked, no HTTP server.
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn(),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() =>
      Promise.resolve({
        beginTransaction: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
        execute: vi.fn().mockResolvedValue([[], undefined]),
        query: vi.fn().mockResolvedValue([[], undefined]),
      })
    ),
  },
}));

const mockDb = vi.mocked(db);

type MockUniverseCtx = {
  universeId: number;
  tenantId: number;
  ownerId: number | null;
  isOmnipotent: boolean;
};

type MockRequest = {
  user: { id: number; permissions: string[] };
  universeCtx: MockUniverseCtx | null;
  scopeFilter: unknown;
};

type MockReply = {
  statusCode: number;
  responseBody: unknown;
  code(c: number): MockReply;
  send(b: unknown): MockReply;
};

function makeRequest(permissions: string[], userId = 5): MockRequest {
  return {
    user: { id: userId, permissions },
    universeCtx: { universeId: 1, tenantId: 0, ownerId: null, isOmnipotent: false },
    scopeFilter: null,
  };
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

describe('FC-18 FaseD-2 — requireOwnership (AT-FC18-D2-RO)', () => {
  let reply: MockReply;

  beforeEach(() => {
    reply = makeReply();
    vi.clearAllMocks();
  });

  // AT-FC18-D2-RO-1: Archon (*) sets anyScope without DB query
  it('AT-FC18-D2-RO-1 — Archon (*) sets anyScope=true without DB query', async () => {
    const req = makeRequest(['*']);
    const guard = requireOwnership('fleet:unit', 'view');
    await guard(req as unknown as FastifyRequest, reply as unknown as FastifyReply);
    expect(req.scopeFilter).toEqual({ anyScope: true });
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  // AT-FC18-D2-RO-2: :any permission → anyScope=true, no DB query
  it('AT-FC18-D2-RO-2 — fleet:unit:view:any sets anyScope=true, no DB query', async () => {
    const req = makeRequest(['fleet:unit:view:any']);
    const guard = requireOwnership('fleet:unit', 'view');
    await guard(req as unknown as FastifyRequest, reply as unknown as FastifyReply);
    expect(req.scopeFilter).toEqual({ anyScope: true });
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  // AT-FC18-D2-RO-3: :own permission + DB has membership → ownerId set, universeCtx updated
  it('AT-FC18-D2-RO-3 — fleet:unit:view:own queries DB, sets ownerId=42', async () => {
    mockDb.execute.mockResolvedValueOnce([[{ owner_id: 42 }], undefined] as never);
    const req = makeRequest(['fleet:unit:view:own']);
    const guard = requireOwnership('fleet:unit', 'view');
    await guard(req as unknown as FastifyRequest, reply as unknown as FastifyReply);
    expect(mockDb.execute).toHaveBeenCalledWith(
      'SELECT owner_id FROM tenant_user_memberships WHERE user_id = ? LIMIT 1',
      [5]
    );
    expect(req.scopeFilter).toEqual({ ownerId: 42 });
    expect(req.universeCtx?.ownerId).toBe(42);
    expect(reply.statusCode).toBe(200);
  });

  // AT-FC18-D2-RO-4: :own permission but no membership row → 403
  it('AT-FC18-D2-RO-4 — fleet:unit:view:own with no membership returns 403', async () => {
    mockDb.execute.mockResolvedValueOnce([[], undefined] as never);
    const req = makeRequest(['fleet:unit:view:own']);
    const guard = requireOwnership('fleet:unit', 'view');
    await guard(req as unknown as FastifyRequest, reply as unknown as FastifyReply);
    expect(reply.statusCode).toBe(403);
    expect((reply.responseBody as { code: string }).code).toBe('FORBIDDEN');
  });

  // AT-FC18-D2-RO-5: Neither :any nor :own → 403 without DB query
  it('AT-FC18-D2-RO-5 — no matching permission returns 403 without DB query', async () => {
    const req = makeRequest(['maint:record:view:any']);
    const guard = requireOwnership('fleet:unit', 'view');
    await guard(req as unknown as FastifyRequest, reply as unknown as FastifyReply);
    expect(reply.statusCode).toBe(403);
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  // AT-FC18-D2-RO-6: Portal-only user cannot access fleet:unit:view scope
  it('AT-FC18-D2-RO-6 — portal-only JWT returns 403 for fleet:unit:view scope', async () => {
    const req = makeRequest(['portal:dashboard:view', 'portal:fleet:view:own']);
    const guard = requireOwnership('fleet:unit', 'view');
    await guard(req as unknown as FastifyRequest, reply as unknown as FastifyReply);
    expect(reply.statusCode).toBe(403);
  });

  // AT-FC18-D2-RO-7: scopeFilter anyScope has no ownerId key
  it('AT-FC18-D2-RO-7 — anyScope scopeFilter has no ownerId property', async () => {
    const req = makeRequest(['fleet:unit:view:any']);
    const guard = requireOwnership('fleet:unit', 'view');
    await guard(req as unknown as FastifyRequest, reply as unknown as FastifyReply);
    const sf = req.scopeFilter as { anyScope: boolean; ownerId?: number };
    expect(sf.anyScope).toBe(true);
    expect(sf.ownerId).toBeUndefined();
  });

  // AT-FC18-D2-RO-8: Different module/operation combination
  it('AT-FC18-D2-RO-8 — maint:record:edit:any works for requireOwnership("maint:record","edit")', async () => {
    const req = makeRequest(['maint:record:edit:any']);
    const guard = requireOwnership('maint:record', 'edit');
    await guard(req as unknown as FastifyRequest, reply as unknown as FastifyReply);
    expect(req.scopeFilter).toEqual({ anyScope: true });
  });

  // AT-FC18-D2-RO-9: :own with universeCtx=null does not throw
  it('AT-FC18-D2-RO-9 — :own with null universeCtx sets scopeFilter without crashing', async () => {
    mockDb.execute.mockResolvedValueOnce([[{ owner_id: 7 }], undefined] as never);
    const req = makeRequest(['fleet:unit:view:own']);
    req.universeCtx = null;
    const guard = requireOwnership('fleet:unit', 'view');
    await guard(req as unknown as FastifyRequest, reply as unknown as FastifyReply);
    expect(req.scopeFilter).toEqual({ ownerId: 7 });
  });
});
