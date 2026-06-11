import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AlertsPanel from './AlertsPanel';
import { Alert } from '../../hooks/useAlerts';

const usePermissionsMock = vi.hoisted(() => vi.fn());
const useAlertsMock = vi.hoisted(() => vi.fn());
const useSovereignLayoutMock = vi.hoisted(() => vi.fn());
const setSectionDataMock = vi.hoisted(() => vi.fn());
const setSearchConfigMock = vi.hoisted(() => vi.fn());
const setSearchTermMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/usePermissions', () => ({
  default: usePermissionsMock,
}));

vi.mock('../../hooks/useAlerts', () => ({
  default: useAlertsMock,
}));

vi.mock('../../context/SovereignLayoutContext', () => ({
  useSovereignLayout: useSovereignLayoutMock,
}));

const sampleAlert: Alert = {
  id: 'MAINT_OVERDUE_ASM-001',
  type: 'MAINTENANCE_OVERDUE',
  severity: 'CRITICAL',
  title: 'Mantenimiento vencido — ASM-001',
  description: 'Odómetro 15000 km supera el pronóstico de 10000 km',
  unitId: 'ASM-001',
  createdAt: '2026-06-11T00:00:00.000Z',
};

const grantAccess = (granted: boolean): void => {
  usePermissionsMock.mockReturnValue({
    hasPermission: (): boolean => granted,
    hasAnyPermission: (): boolean => granted,
    isOmnipotent: (): boolean => false,
  });
};

const renderPanel = (): ReturnType<typeof render> =>
  render(
    <BrowserRouter>
      <AlertsPanel />
    </BrowserRouter>
  );

describe('AlertsPanel — role-scoped guard (Feature Contract Alerts_Role_Scoped_Panel)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAlertsMock.mockReturnValue({ alerts: [sampleAlert], isSyncing: false, refresh: vi.fn() });
    useSovereignLayoutMock.mockReturnValue({
      searchTerm: '',
      setSearchTerm: setSearchTermMock,
      setSearchConfig: setSearchConfigMock,
      setSectionData: setSectionDataMock,
    });
  });

  it('Scenario 5: renders es-MX fallback without table when user lacks all view permissions', () => {
    grantAccess(false);
    renderPanel();

    expect(screen.getByTestId('alerts-access-fallback')).toBeInTheDocument();
    expect(screen.getByText('Sin alertas disponibles para tu perfil')).toBeInTheDocument();
    expect(
      screen.getByText('Tu rol no incluye permisos de visualización de alertas')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('alerts-table')).not.toBeInTheDocument();
  });

  it('Scenario 5: fallback sets section header without severity counter slot', () => {
    grantAccess(false);
    renderPanel();

    expect(setSectionDataMock).toHaveBeenCalledWith(
      'Alertas del Sistema',
      'Monitor de alertas operativas de la flota',
      null,
      null,
      null
    );
  });

  it('Scenario 5: fallback never hydrates alerts data', () => {
    grantAccess(false);
    renderPanel();

    expect(useAlertsMock).not.toHaveBeenCalled();
  });

  it('renders the alerts table when user has at least one view permission', () => {
    grantAccess(true);
    renderPanel();

    expect(screen.getByTestId('alerts-table')).toBeInTheDocument();
    expect(screen.queryByTestId('alerts-access-fallback')).not.toBeInTheDocument();
    expect(screen.getByText('ASM-001')).toBeInTheDocument();
  });

  it('renders severity summary cards in the sovereign header when access is granted', () => {
    grantAccess(true);
    renderPanel();

    expect(setSectionDataMock).toHaveBeenCalled();
    const lastCall = setSectionDataMock.mock.calls[setSectionDataMock.mock.calls.length - 1];
    expect(lastCall[0]).toBe('Alertas del Sistema');
    expect(lastCall[4]).not.toBeNull();
  });

  it('Fase 4: renders COMPLIANCE_EXPIRY alert with es-MX label and description', () => {
    grantAccess(true);
    useAlertsMock.mockReturnValue({
      alerts: [
        {
          id: 'COMPLIANCE_INSURANCE_ASM-104',
          type: 'COMPLIANCE_EXPIRY',
          severity: 'CRITICAL',
          title: 'Documento vencido — ASM-104',
          description: 'Seguro vencido hace 5 días',
          unitId: 'ASM-104',
          createdAt: '2026-06-11T00:00:00.000Z',
        } satisfies Alert,
      ],
      isSyncing: false,
      refresh: vi.fn(),
    });
    renderPanel();

    expect(screen.getByText('Cumplimiento por vencer')).toBeInTheDocument();
    expect(screen.getByText('Seguro vencido hace 5 días')).toBeInTheDocument();
    expect(screen.getByText('ASM-104')).toBeInTheDocument();
  });
});
