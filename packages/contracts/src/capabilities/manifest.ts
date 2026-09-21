/**
 * FC193 F2 — Capabilities Manifest: SSOT en código de la composición Supercúmulo ↔ Cúmulo
 * (D8 / 373_AN, Cond.R-193 B1). Espeja el catálogo sembrado en DB (migraciones 151 y 161) y
 * L-053 §24.3/§24.13.5; `manifest.test.ts` lo compara contra esos SQL para que no puedan divergir.
 *
 * Alcance deliberado de F2: solo lo que consume el gate del API (`requireUniverseCapability`). El mapa
 * módulo-de-permiso → SC | BUILTIN (D2) entra en F4 con su consumidor (el techo perm ∩ SC). Ω y las
 * clases BUILTIN (auth, sesión, SOS, catálogos, identidad…) NO son supercúmulos: no aparecen aquí.
 */

export const CAPABILITIES_MANIFEST = {
  CRM: { permPrefix: 'crm', clusters: [], dependsOn: [] },
  RASTREO: { permPrefix: 'fleet', clusters: [], dependsOn: [] },
  // D9 — dependencia DECLARATIVA: sin enforcement hasta F4 (FC-C / FC-E). Evidencia: aceptar/rechazar
  // una orden de mantenimiento exige `fleet:unit:edit:any` (permiso de RASTREO).
  MANTENIMIENTO: { permPrefix: 'maintenance', clusters: [], dependsOn: ['RASTREO'] },
  FINANZAS: { permPrefix: 'financial', clusters: ['GASTOS_EGRESOS'], dependsOn: [] },
  RRHH: { permPrefix: 'users', clusters: [], dependsOn: [] },
} as const;

/** Código de Supercúmulo del catálogo (`superclusters_catalog.code`). */
export type SuperclusterCode = keyof typeof CAPABILITIES_MANIFEST;

/** Código de Cúmulo del catálogo (`clusters_catalog.code`). */
export type ClusterCode = (typeof CAPABILITIES_MANIFEST)[SuperclusterCode]['clusters'][number];

/** ¿`cluster` pertenece a `supercluster` en el manifiesto? (pertenencia exclusiva, L §24.3). */
export function isClusterOf(supercluster: SuperclusterCode, cluster: string): boolean {
  return (CAPABILITIES_MANIFEST[supercluster].clusters as readonly string[]).includes(cluster);
}
