import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireUniverseCapability } from './requireUniverseCapability';
import { getUniverseCapabilities } from '../services/universeCapabilities.service';

/**
 * FC193 F2 — Capability Gate, tabla de verdad T1 de 373_AN §3 (Scenarios 1, 2 y 3 del FC).
 * El servicio de capacidades se simula: aquí solo se prueba la DECISIÓN del middleware.
 */

vi.mock('../services/universeCapabilities.service', () => ({
  getUniverseCapabilities: vi.fn(),
}));

const capabilities = getUniverseCapabilities as Mock;

const active = (superclusters: string[], clusters: string[] = []): void => {
  capabilities.mockResolvedValue({
    superclusters: new Set(superclusters),
    clusters: new Set(clusters),
  });
};

interface Sent {
  status?: number;
  body?: unknown;
}

// `verifiedUser`: lo que `request.jwtVerify()` deja en `request.user` (undefined ⇒ el JWT es inválido).
const jwtVerify = vi.fn();

const run = async (
  user: unknown,
  requirement: Parameters<typeof requireUniverseCapability>[0],
  verifiedUser?: unknown
): Promise<Sent> => {
  const sent: Sent = {};
  const request = { user } as { user: unknown; jwtVerify: typeof jwtVerify };
  request.jwtVerify = jwtVerify;
  jwtVerify.mockImplementation(async () => {
    if (verifiedUser === undefined) throw new Error('invalid token');
    request.user = verifiedUser;
  });
  const reply = {
    code: (status: number) => {
      sent.status = status;
      return reply;
    },
    send: (body: unknown) => {
      sent.body = body;
      return reply;
    },
  } as unknown as FastifyReply;
  await requireUniverseCapability(requirement)(request as unknown as FastifyRequest, reply);
  return sent;
};

const TENANT_USER = { id: 20, roleId: 3, permissions: ['fleet:unit:view:own'], tenant_id: 5 };

describe('FC193 F2 — requireUniverseCapability (T1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Scenario 3 — Ω es el único bypass y no toca la DB', () => {
    it.each([
      ['roleId 0 con tenant', { id: 1, roleId: 0, permissions: [], tenant_id: 5 }],
      [
        'comodín "*" sin tenant (tenant_id null)',
        { id: 1, roleId: 9, permissions: ['*'], tenant_id: null },
      ],
      ['id 0 (Archon legado) con roleId 0', { id: 0, roleId: 0, permissions: ['*'] }],
    ])('Ω (%s) pasa aunque el SC no esté activo', async (_case, omega) => {
      const sent = await run(omega, { supercluster: 'CRM' });

      expect(sent.status).toBeUndefined();
      expect(capabilities).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 1 — SC activo en el universo: pasa', () => {
    it('SC ACTIVE (sin cluster requerido) ⇒ pasa y consulta el universo del claim tenant_id', async () => {
      active(['MANTENIMIENTO']);

      const sent = await run(TENANT_USER, { supercluster: 'MANTENIMIENTO' });

      expect(sent.status).toBeUndefined();
      expect(capabilities).toHaveBeenCalledWith(5);
    });

    it('SC ACTIVE y cluster ACTIVE (cluster requerido) ⇒ pasa', async () => {
      active(['FINANZAS'], ['GASTOS_EGRESOS']);

      const sent = await run(TENANT_USER, { supercluster: 'FINANZAS', cluster: 'GASTOS_EGRESOS' });

      expect(sent.status).toBeUndefined();
    });
  });

  describe('Scenario 2 — SC no instalado, suspendido o cluster suspendido: 403 CAPABILITY_NOT_ACTIVE', () => {
    it('SC ausente/suspendido (no viene entre los ACTIVE) ⇒ 403 con el formato §8.2', async () => {
      active(['RASTREO']);

      const sent = await run(TENANT_USER, { supercluster: 'CRM' });

      expect(sent.status).toBe(403);
      expect(sent.body).toEqual({
        success: false,
        code: 'CAPABILITY_NOT_ACTIVE',
        message: 'El módulo CRM no está activo en este universo',
      });
    });

    it('SC ACTIVE pero cluster requerido SUSPENDED ⇒ 403', async () => {
      active(['FINANZAS'], []);

      const sent = await run(TENANT_USER, { supercluster: 'FINANZAS', cluster: 'GASTOS_EGRESOS' });

      expect(sent.status).toBe(403);
    });

    it('cluster ACTIVE pero su SC padre NO activo ⇒ 403 (el cluster no basta)', async () => {
      active([], ['GASTOS_EGRESOS']);

      const sent = await run(TENANT_USER, { supercluster: 'FINANZAS', cluster: 'GASTOS_EGRESOS' });

      expect(sent.status).toBe(403);
    });

    it('el universo sin ninguna capacidad activa ⇒ 403', async () => {
      active([]);

      expect((await run(TENANT_USER, { supercluster: 'RASTREO' })).status).toBe(403);
    });
  });

  describe('D3 — tenant_id null/ausente/inválido NO es Ω: 403 sin consultar la DB', () => {
    it.each([
      ['Arc itinerante (tenant_id null)', null],
      ['claim ausente', undefined],
      ['cero', 0],
      ['negativo', -3],
      ['decimal', 1.5],
      ['cadena numérica', '7'],
      ['NaN', Number.NaN],
    ])('%s ⇒ 403 CAPABILITY_NOT_ACTIVE', async (_case, tenantId) => {
      const arc = { id: 30, roleId: 7, permissions: ['social:post:view'], tenant_id: tenantId };

      const sent = await run(arc, { supercluster: 'RASTREO' });

      expect(sent.status).toBe(403);
      expect(sent.body).toMatchObject({ code: 'CAPABILITY_NOT_ACTIVE' });
      expect(capabilities).not.toHaveBeenCalled();
    });
  });

  describe('Anónimo: 401 UNAUTHORIZED', () => {
    it.each([
      ['sin usuario y el JWT no se puede verificar', undefined, undefined],
      ['payload verificado sin id', { roleId: 3, tenant_id: 5 }, undefined],
      ['sin usuario y el JWT verificado no trae id', undefined, { roleId: 3, tenant_id: 5 }],
    ])('%s ⇒ 401', async (_case, user, verifiedUser) => {
      const sent = await run(user, { supercluster: 'RASTREO' }, verifiedUser);

      expect(sent.status).toBe(401);
      expect(sent.body).toMatchObject({ success: false, code: 'UNAUTHORIZED' });
      expect(capabilities).not.toHaveBeenCalled();
    });
  });

  describe('plugins que autentican DENTRO del handler (p. ej. realtimeTelemetry)', () => {
    it('sin request.user, el gate verifica el JWT él mismo y decide con ese usuario', async () => {
      active(['RASTREO']);

      const granted = await run(undefined, { supercluster: 'RASTREO' }, TENANT_USER);
      active([]);
      const refused = await run(undefined, { supercluster: 'RASTREO' }, TENANT_USER);

      expect(granted.status).toBeUndefined();
      expect(refused.status).toBe(403);
      expect(jwtVerify).toHaveBeenCalledTimes(2);
    });

    it('con el usuario ya verificado por el plugin NO vuelve a verificar el JWT', async () => {
      active(['RASTREO']);

      await run(TENANT_USER, { supercluster: 'RASTREO' });

      expect(jwtVerify).not.toHaveBeenCalled();
    });
  });

  it('fail-closed: si leer las capacidades falla, el error se propaga y NO se concede el paso', async () => {
    capabilities.mockRejectedValue(new Error('db down'));

    await expect(run(TENANT_USER, { supercluster: 'RASTREO' })).rejects.toThrow('db down');
  });

  describe('registro: un par (SC, cluster) desconocido falla al construir el hook', () => {
    it('cluster que no pertenece al SC ⇒ lanza', () => {
      expect(() =>
        requireUniverseCapability({ supercluster: 'RASTREO', cluster: 'GASTOS_EGRESOS' })
      ).toThrow('GASTOS_EGRESOS no pertenece a RASTREO');
    });

    it('par válido ⇒ devuelve el preHandler', () => {
      expect(
        requireUniverseCapability({ supercluster: 'FINANZAS', cluster: 'GASTOS_EGRESOS' })
      ).toBeTypeOf('function');
    });
  });
});
