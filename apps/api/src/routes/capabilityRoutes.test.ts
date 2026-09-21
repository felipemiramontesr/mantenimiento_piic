import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import buildApp from '../index';
import db from '../services/db';
import { invalidateUniverseCapabilities } from '../services/universeCapabilities.service';

/**
 * FC193 F2 — el gate de capacidad CABLEADO en la app real (`buildApp()`): se enumeran TODAS las rutas
 * registradas (ambos prefijos, `/v1` y `/v1/mantenimiento`) y se verifica su comportamiento por clase
 * (T1 de 373_AN §3, D1/D3/D4/D7). Una ruta nueva sin clasificar rompe este test (Invariante 1): quien
 * la añada debe decidir su Supercúmulo en `capabilityRoutes.ts` o declararla BUILTIN aquí.
 */

vi.mock('../services/encryption', () => ({
  default: { encrypt: vi.fn((v: string) => v), decrypt: vi.fn((v: string) => v) },
}));
vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn(),
    query: vi.fn(),
    getConnection: vi.fn(),
  },
}));

type Sc = 'RASTREO' | 'MANTENIMIENTO' | 'FINANZAS';
type Class = Sc | 'BUILTIN' | 'UNCLASSIFIED';
interface RouteRef {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
}

// D2 (373_AN): a qué SC pertenece cada ruta. `intelligence` se reparte: tco y economic-life →
// FINANZAS, recalls → MANTENIMIENTO, el resto de analítica por unidad → RASTREO.
const SC_RULES: Array<[RegExp, Sc]> = [
  [/^\/v1\/fleet-units\/[^/]+\/(tco|economic-life)(\/|$)/, 'FINANZAS'],
  [/^\/v1\/fleet-units\/[^/]+\/recalls(\/|$)/, 'MANTENIMIENTO'],
  [/^\/v1\/recalls(\/|$)/, 'MANTENIMIENTO'],
  [/^\/v1\/fleet-units(\/|$)/, 'RASTREO'],
  [/^\/v1\/(fleet|routes|incidents|unit-logs|telemetry)(\/|$)/, 'RASTREO'],
  [/^\/v1\/(maintenance|work-orders|reports)(\/|$)/, 'MANTENIMIENTO'],
  [/^\/v1\/finance(\/|$)/, 'FINANZAS'],
];

// D1/D4 (373_AN + 374_AN): clase BUILTIN — jamás se apaga por mutabilidad de SC. Incluye sesión/MFA,
// SOS (`security`), identidad (`users`, `cosmonauts`, `onboarding`), catálogos (`catalogs`,
// `geolocation`), `social`, herramientas de Ω (`cosmology`, `archon`) y las rutas públicas.
const BUILTIN_PREFIXES = [
  '/v1/auth',
  '/v1/public',
  '/v1/cosmology',
  '/v1/cosmonauts',
  '/v1/onboarding',
  '/v1/users',
  '/v1/catalogs',
  '/v1/geolocation',
  '/v1/alerts',
  '/v1/notifications',
  '/v1/areas',
  '/v1/owners',
  '/v1/security',
  '/v1/social',
  '/v1/archon',
  '/uploads',
];

const stripAlias = (url: string): string => url.replace(/^\/v1\/mantenimiento/, '/v1');

const classify = (url: string): Class => {
  const path = stripAlias(url);
  const sc = SC_RULES.find(([re]) => re.test(path));
  if (sc) return sc[1];
  return BUILTIN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
    ? 'BUILTIN'
    : 'UNCLASSIFIED';
};

const fill = (url: string): string => url.replaceAll(/:[A-Za-z]+/g, '1').replace('*', 'x');

const dbMock = db as unknown as { execute: Mock; query: Mock; getConnection: Mock };

describe('FC193 F2 — gate de capacidad cableado en la app real', () => {
  let app: FastifyInstance;
  const routes: RouteRef[] = [];
  let tenantToken: string;
  let arcToken: string;
  let omegaToken: string;
  let activeRows: Array<{ kind: string; code: string }> = [];
  let ipCounter = 0;

  beforeAll(async () => {
    app = buildApp();
    app.addHook('onRoute', (r) => {
      const methods = Array.isArray(r.method) ? r.method : [r.method];
      methods
        .filter((m) => m !== 'HEAD' && m !== 'OPTIONS')
        .forEach((m) => routes.push({ method: m as RouteRef['method'], url: r.url }));
    });
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    tenantToken = jwt.sign({ id: 20, roleId: 3, permissions: ['x:none'], tenant_id: 5 });
    arcToken = jwt.sign({ id: 30, roleId: 7, permissions: ['social:post:view'], tenant_id: null });
    omegaToken = jwt.sign({ id: 1, roleId: 0, permissions: ['*'], tenant_id: null });
  }, 60000);

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateUniverseCapabilities();
    activeRows = [];
    dbMock.execute.mockImplementation(async (sql: unknown) =>
      String(sql).includes('universe_superclusters') ? [activeRows, undefined] : [[], undefined]
    );
    dbMock.query.mockResolvedValue([[], undefined]);
  });

  // IP distinta por petición: el rate-limit global (100/min por IP) no debe interferir con la tabla.
  const call = (route: RouteRef, token?: string): Promise<LightMyRequestResponse> => {
    ipCounter += 1;
    return app.inject({
      method: route.method,
      url: fill(route.url),
      headers: token ? { authorization: `Bearer ${token}` } : {},
      remoteAddress: `10.${Math.floor(ipCounter / 256)}.${ipCounter % 256}.1`,
      payload: route.method === 'GET' ? undefined : {},
    });
  };

  const denied = (res: LightMyRequestResponse): boolean => {
    if (res.statusCode !== 403) return false;
    try {
      return res.json().code === 'CAPABILITY_NOT_ACTIVE';
    } catch {
      return false;
    }
  };

  /** Rutas cuya respuesta NO coincide con `expectDenied`; lista legible para el mensaje de fallo. */
  const mismatches = async (
    selected: RouteRef[],
    token: string,
    expectDenied: boolean
  ): Promise<string[]> => {
    const results = await Promise.all(
      selected.map(async (route) => ({ route, res: await call(route, token) }))
    );
    return results
      .filter(({ res }) => denied(res) !== expectDenied)
      .map(({ route, res }) => `${route.method} ${route.url} → ${res.statusCode}`);
  };

  const ofClass = (...classes: Class[]): RouteRef[] =>
    routes.filter((r) => classes.includes(classify(r.url)));

  it('Invariante 1 — TODA ruta registrada está clasificada (SC o BUILTIN) y se ven ambos prefijos', () => {
    const unclassified = routes.filter((r) => classify(r.url) === 'UNCLASSIFIED');

    expect(unclassified.map((r) => `${r.method} ${r.url}`)).toEqual([]);
    expect(routes.some((r) => r.url.startsWith('/v1/mantenimiento/'))).toBe(true);
    expect(routes.some((r) => /^\/v1\/(fleet|maintenance|finance)/.test(r.url))).toBe(true);
    expect(ofClass('RASTREO', 'MANTENIMIENTO', 'FINANZAS').length).toBeGreaterThan(50);
  });

  it('Scenario 2 — universo sin ningún SC activo: TODA ruta de SC responde 403 CAPABILITY_NOT_ACTIVE (ambos prefijos)', async () => {
    expect(
      await mismatches(ofClass('RASTREO', 'MANTENIMIENTO', 'FINANZAS'), tenantToken, true)
    ).toEqual([]);
  }, 60000);

  it('D1/D4 — las rutas BUILTIN (auth, SOS, identidad, catálogos, social…) NO dependen de ninguna capacidad', async () => {
    expect(await mismatches(ofClass('BUILTIN'), tenantToken, false)).toEqual([]);
  }, 60000);

  it('D4 — el SOS (POST /security/panic) jamás cae por capacidad, ni con el universo sin SC ni para un Arc itinerante', async () => {
    const panic = routes.filter(
      (r) => r.method === 'POST' && stripAlias(r.url) === '/v1/security/panic'
    );

    expect(panic.length).toBeGreaterThan(0);
    expect(await mismatches(panic, tenantToken, false)).toEqual([]);
    expect(await mismatches(panic, arcToken, false)).toEqual([]);
  });

  it.each<Sc>(['RASTREO', 'MANTENIMIENTO', 'FINANZAS'])(
    'Scenario 1 + aislamiento — con SOLO %s activo: sus rutas pasan el gate y las de los otros SC dan 403',
    async (sc) => {
      activeRows = [
        { kind: 'SUPERCLUSTER', code: sc },
        ...(sc === 'FINANZAS' ? [{ kind: 'CLUSTER', code: 'GASTOS_EGRESOS' }] : []),
      ];
      const own = routes.filter((r) => classify(r.url) === sc);
      const others = routes.filter(
        (r) =>
          ['RASTREO', 'MANTENIMIENTO', 'FINANZAS'].includes(classify(r.url)) &&
          classify(r.url) !== sc
      );

      expect(await mismatches(own, tenantToken, false)).toEqual([]);
      expect(await mismatches(others, tenantToken, true)).toEqual([]);
    },
    60000
  );

  it('D3 — Arc itinerante (tenant_id null, no Ω): 403 en TODA ruta de SC, sin consultar capacidades', async () => {
    expect(
      await mismatches(ofClass('RASTREO', 'MANTENIMIENTO', 'FINANZAS'), arcToken, true)
    ).toEqual([]);
    const capabilityQueries = dbMock.execute.mock.calls.filter((c) =>
      String(c[0]).includes('universe_superclusters')
    );
    expect(capabilityQueries).toHaveLength(0);
  }, 60000);

  it('Scenario 3 — Ω pasa el gate en las rutas de SC (ambos prefijos) sin consultar capacidades', async () => {
    const safe = ofClass('RASTREO', 'MANTENIMIENTO', 'FINANZAS').filter(
      (r) =>
        /^(\/v1|\/v1\/mantenimiento)\/(fleet|maintenance|finance\/dashboard)$/.test(r.url) &&
        r.method === 'GET'
    );

    expect(safe.length).toBeGreaterThanOrEqual(6);
    expect(await mismatches(safe, omegaToken, false)).toEqual([]);
    expect(
      dbMock.execute.mock.calls.filter((c) => String(c[0]).includes('universe_superclusters'))
    ).toHaveLength(0);
  });

  it('el estado se lee del universo del claim tenant_id (5) y se cachea entre peticiones', async () => {
    activeRows = [{ kind: 'SUPERCLUSTER', code: 'RASTREO' }];
    const route: RouteRef = { method: 'GET', url: '/v1/fleet' };

    await call(route, tenantToken);
    await call(route, tenantToken);

    const capabilityQueries = dbMock.execute.mock.calls.filter((c) =>
      String(c[0]).includes('universe_superclusters')
    );
    expect(capabilityQueries).toHaveLength(1);
    expect(capabilityQueries[0][1]).toEqual([5, 5]);
  });
});
