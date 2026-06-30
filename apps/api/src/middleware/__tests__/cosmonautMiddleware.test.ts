import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';

import db from '../../services/db';
import {
  resolveEffectivePermissions,
  requireOmega,
  requireMuOrOmega,
  antiEscalationGuard,
} from '../cosmonautMiddleware';

/**
 * AT-FC24-C: Cosmonaut Middleware Unit Tests
 * Covers: resolveEffectivePermissions · requireOmega · requireMuOrOmega · antiEscalationGuard
 * Strategy: mock db — no DB connection needed.
 */

// Mock db before importing the module under test
vi.mock('../../services/db', () => ({
  default: {
    execute: vi.fn(),
    query: vi.fn(),
    getConnection: vi.fn(),
  },
}));

type MockDb = { execute: ReturnType<typeof vi.fn> };

type MockReply = {
  statusCode: number;
  responseBody: unknown;
  sent: boolean;
  code(c: number): MockReply;
  send(b: unknown): MockReply;
};

function makeReply(): MockReply {
  const reply: MockReply = {
    statusCode: 200,
    responseBody: null,
    sent: false,
    code(c: number): MockReply {
      reply.statusCode = c;
      return reply;
    },
    send(b: unknown): MockReply {
      reply.responseBody = b;
      reply.sent = true;
      return reply;
    },
  };
  return reply;
}

function makeRequest(user: object): FastifyRequest {
  return { user } as unknown as FastifyRequest;
}

// ─── resolveEffectivePermissions ────────────────────────────────────────────

describe('AT-FC24-C-1: resolveEffectivePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AT-FC24-C-1-1: returns union of slugs from assigned roles', async () => {
    (db as unknown as MockDb).execute.mockResolvedValueOnce([
      [{ slug: 'maint:record:view:any' }, { slug: 'fleet:unit:view:any' }],
    ]);
    const perms = await resolveEffectivePermissions(42, 7);
    expect(perms).toContain('maint:record:view:any');
    expect(perms).toContain('fleet:unit:view:any');
    expect(perms).toHaveLength(2);
  });

  it('AT-FC24-C-1-2: returns empty array when Arc has no role assignments', async () => {
    (db as unknown as MockDb).execute.mockResolvedValueOnce([[]]);
    const perms = await resolveEffectivePermissions(99, 1);
    expect(perms).toEqual([]);
  });

  it('AT-FC24-C-1-3: SQL query passes userId and tenantId as bind params', async () => {
    (db as unknown as MockDb).execute.mockResolvedValueOnce([[]]);
    await resolveEffectivePermissions(5, 3);
    const [, params] = (db as unknown as MockDb).execute.mock.calls[0] as [string, unknown[]];
    expect(params[0]).toBe(5);
    expect(params[1]).toBe(3);
  });
});

// ─── requireOmega ────────────────────────────────────────────────────────────

describe('AT-FC24-C-2: requireOmega', () => {
  it('AT-FC24-C-2-1: allows caller with roleId=0 (Ω)', async () => {
    const reply = makeReply();
    await requireOmega()(
      makeRequest({ roleId: 0, permissions: [] }),
      reply as unknown as FastifyReply
    );
    expect(reply.statusCode).toBe(200);
    expect(reply.sent).toBe(false);
  });

  it('AT-FC24-C-2-2: allows caller with wildcard permissions (*)', async () => {
    const reply = makeReply();
    await requireOmega()(
      makeRequest({ roleId: 1, permissions: ['*'] }),
      reply as unknown as FastifyReply
    );
    expect(reply.sent).toBe(false);
  });

  it('AT-FC24-C-2-3: blocks non-Ω caller with 403', async () => {
    const reply = makeReply();
    await requireOmega()(
      makeRequest({ roleId: 3, permissions: ['maint:record:view:any'] }),
      reply as unknown as FastifyReply
    );
    expect(reply.statusCode).toBe(403);
    expect((reply.responseBody as { code: string }).code).toBe('FORBIDDEN');
    expect(reply.sent).toBe(true);
  });
});

// ─── requireMuOrOmega ────────────────────────────────────────────────────────

describe('AT-FC24-C-3: requireMuOrOmega', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AT-FC24-C-3-1: allows Ω (roleId=0) without DB query', async () => {
    const reply = makeReply();
    await requireMuOrOmega(10)(
      makeRequest({ id: 1, roleId: 0, permissions: [] }),
      reply as unknown as FastifyReply
    );
    expect(reply.sent).toBe(false);
    expect((db as unknown as MockDb).execute).not.toHaveBeenCalled();
  });

  it('AT-FC24-C-3-2: allows MU (cosmonaut_type=MU in membership)', async () => {
    (db as unknown as MockDb).execute.mockResolvedValueOnce([[{ cosmonaut_type: 'MU' }]]);
    const reply = makeReply();
    await requireMuOrOmega(10)(
      makeRequest({ id: 5, roleId: 2, permissions: [] }),
      reply as unknown as FastifyReply
    );
    expect(reply.sent).toBe(false);
  });

  it('AT-FC24-C-3-3: blocks ARC (cosmonaut_type=ARC) with 403', async () => {
    (db as unknown as MockDb).execute.mockResolvedValueOnce([[{ cosmonaut_type: 'ARC' }]]);
    const reply = makeReply();
    await requireMuOrOmega(10)(
      makeRequest({ id: 7, roleId: 2, permissions: [] }),
      reply as unknown as FastifyReply
    );
    expect(reply.statusCode).toBe(403);
    expect(reply.sent).toBe(true);
  });

  it('AT-FC24-C-3-4: blocks user with no membership with 403', async () => {
    (db as unknown as MockDb).execute.mockResolvedValueOnce([[]]);
    const reply = makeReply();
    await requireMuOrOmega(10)(
      makeRequest({ id: 99, roleId: 3, permissions: [] }),
      reply as unknown as FastifyReply
    );
    expect(reply.statusCode).toBe(403);
    expect(reply.sent).toBe(true);
  });
});

// ─── antiEscalationGuard ─────────────────────────────────────────────────────

describe('AT-FC24-C-4: antiEscalationGuard (I8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AT-FC24-C-4-1: Ω (role_id=0 in users) bypasses escalation check', async () => {
    // resolveEffectivePermissions call
    (db as unknown as MockDb).execute
      .mockResolvedValueOnce([[]]) // grantor perms (empty — Ω has none via cosmonaut)
      .mockResolvedValueOnce([[{ role_id: 0 }]]); // omega check → role_id=0 found
    const result = await antiEscalationGuard(1, 10, 2);
    expect(result).toBe(true);
  });

  it('AT-FC24-C-4-2: allowed when role perms are subset of grantor perms (I8 satisfied)', async () => {
    (db as unknown as MockDb).execute
      .mockResolvedValueOnce([[{ slug: 'maint:record:view:any' }, { slug: 'fleet:unit:view:any' }]]) // grantor perms
      .mockResolvedValueOnce([[]]) // omega check → NOT Ω
      .mockResolvedValueOnce([[{ slug: 'maint:record:view:any' }]]); // role perms
    const result = await antiEscalationGuard(5, 10, 3);
    expect(result).toBe(true);
  });

  it('AT-FC24-C-4-3: blocked when role perms exceed grantor perms (I8 violated)', async () => {
    (db as unknown as MockDb).execute
      .mockResolvedValueOnce([[{ slug: 'maint:record:view:any' }]]) // grantor perms (only view)
      .mockResolvedValueOnce([[]]) // omega check → NOT Ω
      .mockResolvedValueOnce([[{ slug: 'maint:record:edit:any' }]]) // role has edit — escalation!
      .mockResolvedValueOnce([[]]); // lattice query → no exception
    const result = await antiEscalationGuard(5, 10, 3);
    expect(result).toBe(false);
  });
});
