import { describe, it, expect } from 'vitest';
import { applyPermissionCeiling, classifyPermission } from './permissionCeiling';

/** FC193 F4 — Scenario 4 del FC (techo de permisos) + Invariante 3. */

describe('FC193 F4 — classifyPermission', () => {
  it.each([
    ['fleet:unit:view:any', 'RASTREO'],
    ['route:waypoint:manage', 'RASTREO'],
    ['maint:record:create', 'MANTENIMIENTO'],
    ['fleet:unit:edit:any', 'MANTENIMIENTO'],
    ['workorder:close', 'MANTENIMIENTO'],
    ['intelligence:recall:sync', 'MANTENIMIENTO'],
    ['finance:transaction:create', 'FINANZAS'],
    ['intelligence:tco:view', 'FINANZAS'],
    ['intelligence:economic-life:view', 'FINANZAS'],
    ['crm:contact:view', 'CRM'],
    ['crm:campaign:manage', 'CRM'],
  ])('%s → %s', (slug, sc) => {
    expect(classifyPermission(slug)).toBe(sc);
  });

  it.each([
    'fleet:catalog:view', // D1/374_AN: catálogo de activos es núcleo, no RASTREO, pese al prefijo
    'users:collaborator:view',
    'user:admin',
    'admin:role:edit',
    'social:post:view',
    'alert:view:any',
    'notifications:view:own',
    'security:audit:view',
    'geolocation:realtime:view', // no gatea ninguna ruta hoy (D2/375_AN lo asigna a RASTREO a nivel de
    // ruta, no de slug de permiso); ausente del mapa ⇒ nunca se techa
    'onboarding:client:create',
    'intelligence:report:export', // legacy alias target; ningún archivo SC-gateado lo exige hoy
    '*',
  ])('%s → null (núcleo, nunca se techa)', (slug) => {
    expect(classifyPermission(slug)).toBeNull();
  });
});

describe('FC193 F4 — applyPermissionCeiling (Invariante 3, Scenario 4)', () => {
  it('Scenario 4 — un permiso de un SC inactivo desaparece de los efectivos', () => {
    const result = applyPermissionCeiling(
      ['crm:contact:view', 'users:collaborator:view'],
      new Set()
    );

    expect(result).toEqual(['users:collaborator:view']);
  });

  it('con el SC activo, el permiso se conserva', () => {
    const result = applyPermissionCeiling(['fleet:unit:view:any'], new Set(['RASTREO']));

    expect(result).toEqual(['fleet:unit:view:any']);
  });

  it('los permisos núcleo se conservan SIEMPRE, con o sin ningún SC activo', () => {
    const core = [
      'users:collaborator:view',
      'admin:role:edit',
      'social:post:view',
      'alert:view:any',
    ];

    expect(applyPermissionCeiling(core, new Set())).toEqual(core);
    expect(applyPermissionCeiling(core, new Set(['RASTREO', 'FINANZAS']))).toEqual(core);
  });

  it('conjunto mixto: solo sobreviven los del SC activo + los núcleo, en el mismo orden', () => {
    const result = applyPermissionCeiling(
      [
        'fleet:unit:view:any',
        'maint:record:view:any',
        'users:collaborator:view',
        'crm:contact:view',
      ],
      new Set(['RASTREO'])
    );

    expect(result).toEqual(['fleet:unit:view:any', 'users:collaborator:view']);
  });

  it('MANTENIMIENTO activo pero RASTREO no: fleet:unit:edit:any sobrevive (pertenece a MANTENIMIENTO)', () => {
    const result = applyPermissionCeiling(
      ['fleet:unit:edit:any', 'fleet:unit:view:any'],
      new Set(['MANTENIMIENTO'])
    );

    expect(result).toEqual(['fleet:unit:edit:any']);
  });

  it('lista vacía o sin ningún SC activo con solo permisos de SC ⇒ vacío', () => {
    expect(applyPermissionCeiling([], new Set(['RASTREO']))).toEqual([]);
    expect(applyPermissionCeiling(['crm:contact:view'], new Set())).toEqual([]);
  });

  it('no muta el array de entrada', () => {
    const input = ['crm:contact:view', 'users:collaborator:view'];
    applyPermissionCeiling(input, new Set());

    expect(input).toEqual(['crm:contact:view', 'users:collaborator:view']);
  });
});
