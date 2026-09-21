import { readFileSync } from 'node:fs';
import { describe, it, expect, expectTypeOf } from 'vitest';
import { CAPABILITIES_MANIFEST, isClusterOf } from './manifest';
import type { ClusterCode, SuperclusterCode } from './manifest';

/**
 * FC193 F2 — el manifiesto debe espejar el catálogo sembrado en DB (migraciones 151 y 161). Se parsean
 * los propios SQL: si alguien cambia un `perm_prefix`, un código de SC o de cluster en la migración (o
 * en el manifiesto) sin tocar el otro lado, este test falla. Verificación de invariantes cuantificados
 * (R-TRUTHTABLE, Enmienda F5): chequeo exhaustivo sobre el dominio finito de 5 SC y 1 cluster.
 */

const migration = (name: string): string =>
  readFileSync(new URL(`../../../database/migrations/${name}`, import.meta.url), 'utf8');

const SC_SEED = migration('151_cosmological_catalogs.sql');
const CLUSTER_SEED = migration('161_clusters_catalog.sql');

const seededSuperclusters = (): Array<[string, string]> => {
  const block = SC_SEED.split('INSERT IGNORE INTO superclusters_catalog')[1];
  return [...block.matchAll(/\('([A-Z]+)',\s*'[^']*',\s*'([a-z_]+)',/g)].map((m) => [m[1], m[2]]);
};

const seededClusters = (): Array<{ code: string; permPrefix: string; supercluster: string }> => {
  const block = CLUSTER_SEED.split('INSERT IGNORE INTO clusters_catalog')[1];
  return [
    ...block.matchAll(
      /SELECT sc\.id, '([A-Z_]+)',\s*'[^']*',\s*'([a-z_]+)'[\s\S]*?WHERE\s+sc\.code = '([A-Z]+)'/g
    ),
  ].map((m) => ({ code: m[1], permPrefix: m[2], supercluster: m[3] }));
};

const scCodes = Object.keys(CAPABILITIES_MANIFEST) as SuperclusterCode[];

describe('FC193 F2 — CAPABILITIES_MANIFEST vs catálogo sembrado en DB', () => {
  it('los 5 Supercúmulos y su perm_prefix coinciden 1:1 con superclusters_catalog (migración 151)', () => {
    const seeded = seededSuperclusters();

    expect(seeded).toHaveLength(5);
    expect(new Map(seeded)).toEqual(
      new Map(scCodes.map((code) => [code, CAPABILITIES_MANIFEST[code].permPrefix]))
    );
  });

  it('los Cúmulos coinciden 1:1 con clusters_catalog (migración 161) y cuelgan del SC correcto', () => {
    const seeded = seededClusters();
    const declared = scCodes.flatMap((sc) =>
      (CAPABILITIES_MANIFEST[sc].clusters as readonly string[]).map((cluster) => ({
        code: cluster,
        supercluster: sc,
      }))
    );

    expect(seeded.map(({ code, supercluster }) => ({ code, supercluster }))).toEqual(declared);
    expect(seeded).toEqual([
      { code: 'GASTOS_EGRESOS', permPrefix: 'finance', supercluster: 'FINANZAS' },
    ]);
  });

  it('pertenencia exclusiva (∃!): ningún cluster aparece bajo dos Supercúmulos', () => {
    const all = scCodes.flatMap((sc) => CAPABILITIES_MANIFEST[sc].clusters as readonly string[]);

    expect(new Set(all).size).toBe(all.length);
  });

  it('D9: las dependencias declaradas apuntan a SC existentes, sin auto-dependencia y sin ciclos', () => {
    const deps = (sc: SuperclusterCode): readonly string[] => CAPABILITIES_MANIFEST[sc].dependsOn;
    const reaches = (from: string, target: string, seen: Set<string> = new Set()): boolean => {
      if (seen.has(from)) return false;
      seen.add(from);
      return deps(from as SuperclusterCode).some(
        (next) => next === target || reaches(next, target, seen)
      );
    };

    scCodes.forEach((sc) => {
      deps(sc).forEach((dep) => expect(scCodes).toContain(dep));
      expect(reaches(sc, sc)).toBe(false);
    });
    expect(deps('MANTENIMIENTO')).toEqual(['RASTREO']);
  });

  it('tipos: SuperclusterCode y ClusterCode se derivan del manifiesto', () => {
    expectTypeOf<SuperclusterCode>().toEqualTypeOf<
      'CRM' | 'RASTREO' | 'MANTENIMIENTO' | 'FINANZAS' | 'RRHH'
    >();
    expectTypeOf<ClusterCode>().toEqualTypeOf<'GASTOS_EGRESOS'>();
  });
});

describe('FC193 F2 — isClusterOf', () => {
  it('true solo para el cluster que pertenece a ese Supercúmulo', () => {
    expect(isClusterOf('FINANZAS', 'GASTOS_EGRESOS')).toBe(true);
    expect(isClusterOf('RASTREO', 'GASTOS_EGRESOS')).toBe(false);
    expect(isClusterOf('CRM', 'GASTOS_EGRESOS')).toBe(false);
    expect(isClusterOf('FINANZAS', 'NO_EXISTE')).toBe(false);
  });
});
