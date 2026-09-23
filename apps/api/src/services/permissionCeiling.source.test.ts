import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { PERMISSION_SUPERCLUSTER_MAP } from './permissionCeiling';

/**
 * FC193 F4 — deriva RASTREO/MANTENIMIENTO/FINANZAS del mapa por grep de los MISMOS archivos que
 * `capabilityRoutes.ts` asigna a cada Supercúmulo (`requirePermission('slug')` y `withPerm('slug')`):
 * si alguien agrega un permiso nuevo a uno de esos archivos sin actualizar `permissionCeiling.ts`, este
 * test falla. No cubre CRM (0 rutas, técado por prefijo completo — ver `permissionCeiling.ts`).
 */

const route = (name: string): string =>
  readFileSync(new URL(`../routes/${name}`, import.meta.url), 'utf8');

// [a-z0-9-]: co2:view lleva un dígito — el slug no es solo letras.
const SLUG_RE = /(?:requirePermission|withPerm)\(\s*'([a-z][a-z0-9-]*:[a-z0-9:-]+)'\s*\)/g;

function slugsIn(files: string[]): Set<string> {
  const slugs = new Set<string>();
  files.forEach((file) => {
    [...route(file).matchAll(SLUG_RE)].forEach((m) => slugs.add(m[1]));
  });
  return slugs;
}

const FILES = {
  RASTREO: [
    'fleet.ts',
    'fleetRoutes.ts',
    'fleetIntelligence.ts',
    'anomalyDetection.ts',
    'operatorScorecard.ts',
    'co2.ts',
  ],
  MANTENIMIENTO: [
    'fleetMaintenance.ts',
    'workOrders.ts',
    'reports.ts',
    'fleetRecalls.ts',
    'recallsNhtsa.ts',
    'recallsInternal.ts',
  ],
  FINANZAS: ['finance.ts', 'fleetTco.ts', 'economicLife.ts'],
} as const;

describe('FC193 F4 — PERMISSION_SUPERCLUSTER_MAP vs los archivos de ruta reales', () => {
  (Object.keys(FILES) as Array<keyof typeof FILES>).forEach((sc) => {
    it(`todo slug exigido en los archivos ${sc} está en el mapa como ${sc}`, () => {
      const live = slugsIn([...FILES[sc]]);
      const declared = new Set(
        Object.entries(PERMISSION_SUPERCLUSTER_MAP)
          .filter(([, v]) => v === sc)
          .map(([k]) => k)
      );
      expect([...live].sort()).toEqual([...declared].sort());
    });
  });

  it('ningún slug del mapa (RASTREO/MANTENIMIENTO/FINANZAS) queda huérfano de los archivos reales', () => {
    const allLive = slugsIn([...FILES.RASTREO, ...FILES.MANTENIMIENTO, ...FILES.FINANZAS]);
    const mapped = Object.keys(PERMISSION_SUPERCLUSTER_MAP);

    expect(mapped.every((slug) => allLive.has(slug))).toBe(true);
  });
});
