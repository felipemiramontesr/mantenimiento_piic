import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as AlertsRepository from './alerts.repository';
import { getAlerts, getAlertsCount, type UserAlertContext } from './alerts.service';

/**
 * FC201 F3 — alerta `SECURITY_THREAT` en la campana (AlertsPanel): una por tipo de evento con
 * actividad en la última hora (debounce 1 h/tipo por construcción), solo para Ω y sin la IP.
 */

vi.mock('./alerts.repository', () => ({
  countOverdueMaintenance: vi.fn().mockResolvedValue(0),
  countOpenIncidents: vi.fn().mockResolvedValue(0),
  countCriticalUnits: vi.fn().mockResolvedValue(0),
  countComplianceExpiry: vi.fn().mockResolvedValue(0),
  countLeaseMissing: vi.fn().mockResolvedValue(0),
  countFinesRegistered: vi.fn().mockResolvedValue(0),
  countExpenseAnomalies: vi.fn().mockResolvedValue(0),
  listOverdueMaintenance: vi.fn().mockResolvedValue([]),
  listOpenIncidents: vi.fn().mockResolvedValue([]),
  listCriticalUnits: vi.fn().mockResolvedValue([]),
  listComplianceExpiry: vi.fn().mockResolvedValue([]),
  listLeaseMissing: vi.fn().mockResolvedValue([]),
  listFinesRegistered: vi.fn().mockResolvedValue([]),
  listExpenseAnomalies: vi.fn().mockResolvedValue([]),
  listRecentSecurityThreats: vi.fn(),
}));
vi.mock('./catalogMapper', () => ({ resolveCatalogId: vi.fn().mockResolvedValue(1) }));

const OMEGA: UserAlertContext = { userId: 1, permissions: ['*'], tenantId: null };
const EVERY_VIEW: UserAlertContext = {
  userId: 20,
  permissions: ['maint:view', 'route:view', 'fleet:view', 'financial:view'],
  tenantId: 5,
};

beforeEach(() => {
  (AlertsRepository.listRecentSecurityThreats as Mock).mockReset();
});

describe('SECURITY_THREAT', () => {
  it('una alerta HIGH por tipo de evento, sin IP y con la fecha del último toque', async () => {
    (AlertsRepository.listRecentSecurityThreats as Mock).mockResolvedValue([
      {
        event_type: 'TRAP_ACCOUNT',
        ips: '2',
        hits: 9,
        top_pattern: 'login:trap-account',
        last_seen_at: '2026-09-30 14:10:00',
      },
      {
        event_type: 'OTRO_TIPO',
        ips: 1,
        hits: 1,
        top_pattern: 'x',
        last_seen_at: new Date('2026-09-30T20:00:00Z'),
      },
    ]);

    const alerts = await getAlerts(OMEGA);

    const summary = alerts.map((a) => [a.id, a.title, a.severity, a.unitId]);
    expect(summary.sort()).toEqual([
      ['SECURITY_THREAT_OTRO_TIPO', 'Amenaza detectada', 'HIGH', ''],
      ['SECURITY_THREAT_TRAP_ACCOUNT', 'Amenaza detectada: cuenta señuelo', 'HIGH', ''],
    ]);
    const trap = alerts.find((a) => a.id === 'SECURITY_THREAT_TRAP_ACCOUNT');
    expect(trap?.description).toContain('2 IP(s) · 9 toque(s)');
    expect(trap?.createdAt).toBe('2026-09-30 14:10:00');
    const other = alerts.find((a) => a.id === 'SECURITY_THREAT_OTRO_TIPO');
    expect(other?.createdAt).toBe('2026-09-30T20:00:00.000Z');
  });

  it('el conteo de la campana suma un aviso por tipo activo', async () => {
    (AlertsRepository.listRecentSecurityThreats as Mock).mockResolvedValue([
      { event_type: 'BAIT_ROUTE' },
      { event_type: 'TRAP_FIELD' },
    ]);

    expect(await getAlertsCount(OMEGA)).toBe(2);
  });

  it('nadie sin `*` la ve ni dispara la consulta, aunque tenga todos los permisos de vista', async () => {
    const alerts = await getAlerts(EVERY_VIEW);

    expect(alerts.some((a) => a.type === 'SECURITY_THREAT')).toBe(false);
    expect(AlertsRepository.listRecentSecurityThreats).not.toHaveBeenCalled();
  });
});
