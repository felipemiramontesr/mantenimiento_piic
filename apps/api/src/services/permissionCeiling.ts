import type { SuperclusterCode } from '@mantenimiento/contracts';

/**
 * FC193 F4 — Techo de Permisos (Invariante 3 · Anti-Escalamiento I8/A1-S): `permisosEfectivos =
 * permisosRol ∩ (BUILTIN ∪ permisos(SC_activos))`. Mapa slug→Supercúmulo derivado del ÚNICO lugar
 * donde cada slug se consume hoy como guard de una ruta de negocio (`requirePermission`/`withPerm` en
 * los archivos que `capabilityRoutes.ts` clasifica como RASTREO/MANTENIMIENTO/FINANZAS); el CRM
 * (0 rutas vivas, 372_AN R6) se techa por prefijo completo porque sus 22 slugs son autocontenidos, sin
 * ambigüedad con otro módulo. `permissionCeiling.source.test.ts` re-deriva RASTREO/MANTENIMIENTO/
 * FINANZAS por grep de esos mismos archivos: si alguien agrega un permiso a un archivo SC-gateado sin
 * actualizar este mapa, ese test falla (mismo principio que `manifest.test.ts` contra las migraciones).
 *
 * Un slug AUSENTE de este mapa (identidad, administración, alertas, sesión, catálogos, social…) NUNCA
 * se filtra — ver `fleet:catalog:view` (BUILTIN pese al prefijo `fleet`, D1/374_AN: el catálogo de
 * activos es núcleo, no queda atado a RASTREO). Ante la duda, un slug se deja FUERA del mapa: reducir
 * de más rompe una función no relacionada; no reducir uno que sí debería filtrarse es, como mucho,
 * redundante con el 403 que ya impone el gate de F2 en la ruta que lo exige.
 */
export const PERMISSION_SUPERCLUSTER_MAP: Readonly<Record<string, SuperclusterCode>> = {
  // RASTREO — fleet.ts, fleetRoutes.ts, fleetIntelligence.ts, anomalyDetection.ts, operatorScorecard.ts, co2.ts
  'fleet:unit:view:any': 'RASTREO',
  'fleet:unit:create': 'RASTREO',
  'fleet:unit:delete:any': 'RASTREO',
  'route:record:view:any': 'RASTREO',
  'route:record:create': 'RASTREO',
  'route:record:edit:any': 'RASTREO',
  'route:record:delete:any': 'RASTREO',
  'route:waypoint:manage': 'RASTREO',
  'intelligence:anomaly:view': 'RASTREO',
  'intelligence:scorecard:view': 'RASTREO',
  'intelligence:co2:view': 'RASTREO',
  // MANTENIMIENTO — fleetMaintenance.ts, workOrders.ts, reports.ts, fleetRecalls.ts, recallsNhtsa.ts, recallsInternal.ts
  'maint:record:view:any': 'MANTENIMIENTO',
  'maint:record:create': 'MANTENIMIENTO',
  'maint:record:edit:any': 'MANTENIMIENTO',
  // Único consumidor real hoy: aceptar/rechazar una orden de mantenimiento (fleetMaintenance.ts). El
  // nombre sugiere RASTREO; se techa por MANTENIMIENTO porque ahí es donde se exige (y encarna, sin
  // enforcement adicional, la dependencia declarada MANTENIMIENTO→RASTREO del manifiesto, D9).
  'fleet:unit:edit:any': 'MANTENIMIENTO',
  'workorder:view:any': 'MANTENIMIENTO',
  'workorder:create': 'MANTENIMIENTO',
  'workorder:task:manage': 'MANTENIMIENTO',
  'workorder:close': 'MANTENIMIENTO',
  'intelligence:recall:view': 'MANTENIMIENTO',
  'intelligence:recall:manage': 'MANTENIMIENTO',
  'intelligence:recall:sync': 'MANTENIMIENTO',
  // FINANZAS — finance.ts, fleetTco.ts, economicLife.ts
  'finance:dashboard:view:any': 'FINANZAS',
  'finance:transaction:create': 'FINANZAS',
  'intelligence:tco:view': 'FINANZAS',
  'intelligence:economic-life:view': 'FINANZAS',
};

const CRM_PREFIX = 'crm:';

/** Supercúmulo dueño de `slug`, o `null` si es núcleo (nunca se techa). */
export function classifyPermission(slug: string): SuperclusterCode | null {
  if (slug.startsWith(CRM_PREFIX)) return 'CRM';
  return PERMISSION_SUPERCLUSTER_MAP[slug] ?? null;
}

/** Invariante 3 — filtra `permissions` a los que son núcleo o cuyo Supercúmulo está en
 *  `activeSuperclusters`. Determinista y sin I/O: la caché/consulta del estado de capacidades vive en
 *  el llamador (`getUniverseCapabilities`), no aquí. */
export function applyPermissionCeiling(
  permissions: readonly string[],
  activeSuperclusters: ReadonlySet<string>
): string[] {
  return permissions.filter((slug) => {
    const sc = classifyPermission(slug);
    return sc === null || activeSuperclusters.has(sc);
  });
}
