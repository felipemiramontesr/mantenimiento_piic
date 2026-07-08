// FC 067 F3 — L_social_Adoption (Arcsial), Scenario 2: aislamiento operativo.
// §24.9.3/§24.11.4 (L-CORE + 053): OBS_operativo (alertas, KPIs, incidencias)
// NUNCA debe exponerse vía L_social. Verificación estática: el módulo social.ts
// (el feed/Arcsial) solo toca tablas social_*/owners/users — nunca tablas
// operativas (alertas, telemetría, movimientos, finanzas).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(resolve(__dirname, 'social.ts'), 'utf8');

const OPERATIONAL_TABLES = [
  'fleet_movements',
  'fleet_units',
  'financial_transactions',
  'realtime_telemetry',
  'notifications_outbox',
  'route_incidents',
  'maintenance_details',
];

describe('FC 067 F3 — social.ts (Arcsial) · aislamiento OBS_operativo ⊄ L_social', () => {
  it('no referencia ninguna tabla operativa (§24.9.3 modos disjuntos)', () => {
    OPERATIONAL_TABLES.forEach((table) => {
      expect(source).not.toContain(table);
    });
  });

  it('solo opera sobre tablas sociales + identidad (owners/users/membership)', () => {
    const ALLOWED = [
      'social_posts',
      'social_reactions',
      'social_comments',
      'social_reviews',
      'owners',
      'users',
      'user_owner_membership',
      'owner_service_links',
      'owner_profiles',
      'upa_work_orders',
    ];
    const tableRefs = source.match(/FROM\s+(\w+)|JOIN\s+\(?\s*(\w+)/g) ?? [];
    tableRefs
      .map((ref) => ref.replace(/^(FROM|JOIN)\s+\(?\s*/, ''))
      .filter((table) => table !== 'SELECT')
      .forEach((table) => {
        expect(ALLOWED).toContain(table);
      });
  });
});
