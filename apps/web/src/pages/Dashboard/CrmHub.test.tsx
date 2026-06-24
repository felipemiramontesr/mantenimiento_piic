/**
 * FC-11 CRM_Hub_Navigation — CrmHub
 *
 * FaseA:
 * AT-FC11-A-WEB-1: renderiza exactamente 5 tarjetas de módulo CRM (omnipotente)
 * AT-FC11-A-WEB-2: click en tarjeta Contratos navega a /dashboard/contracts
 * AT-FC11-A-WEB-3: data-testid "crm-hub" presente en el contenedor raíz
 * AT-FC11-A-WEB-4: todos los botones de tarjeta contienen el texto "ABRIR MÓDULO"
 * AT-FC11-A-WEB-5: setSectionData es llamado con 'CRM' al montar el componente
 *
 * FaseB:
 * AT-FC11-B-WEB-1: Campañas oculta para usuario con fleet:view y !isOmnipotent
 * AT-FC11-B-WEB-2: Omnipotente ve las 5 tarjetas (incluye Campañas)
 * AT-FC11-B-WEB-3: sin fleet:view y !isOmnipotent redirige a /dashboard
 * AT-FC11-B-WEB-4: usuario con fleet:view ve exactamente 4 tarjetas (sin Campañas)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import CrmHub from './CrmHub';

const navigateMock = vi.fn();
const setSectionDataMock = vi.fn();
const usePermissionsMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return { ...actual, useNavigate: vi.fn() };
});

vi.mock('../../context/SovereignLayoutContext', () => ({
  useSovereignLayout: (): { setSectionData: typeof setSectionDataMock } => ({
    setSectionData: setSectionDataMock,
  }),
}));

vi.mock('../../hooks/usePermissions', () => ({
  default: usePermissionsMock,
}));

const fullPermissions = {
  hasPermission: (): boolean => true,
  hasAnyPermission: (): boolean => true,
  isOmnipotent: (): boolean => true,
  isExternalClientOnly: (): boolean => false,
  isSuiteVIM: (): boolean => false,
  isFamiliar: (): boolean => false,
};

const fleetOnlyPermissions = {
  hasPermission: (p: string): boolean => p === 'fleet:view',
  hasAnyPermission: (ps: string[]): boolean => ps.includes('fleet:view'),
  isOmnipotent: (): boolean => false,
  isExternalClientOnly: (): boolean => false,
  isSuiteVIM: (): boolean => false,
  isFamiliar: (): boolean => false,
};

const noPermissions = {
  hasPermission: (): boolean => false,
  hasAnyPermission: (): boolean => false,
  isOmnipotent: (): boolean => false,
  isExternalClientOnly: (): boolean => false,
  isSuiteVIM: (): boolean => false,
  isFamiliar: (): boolean => false,
};

const renderHub = (): ReturnType<typeof render> =>
  render(
    <BrowserRouter>
      <CrmHub />
    </BrowserRouter>
  );

describe('FC-11 CRM_Hub_Navigation — CrmHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(navigateMock);
    usePermissionsMock.mockReturnValue(fullPermissions);
  });

  describe('FaseA — Hub view y navegación', () => {
    it('AT-FC11-A-WEB-1: renderiza exactamente 5 tarjetas de módulo CRM (omnipotente)', () => {
      renderHub();
      const cards = [
        screen.getByTestId('crm-card-directorio'),
        screen.getByTestId('crm-card-contratos'),
        screen.getByTestId('crm-card-pipeline'),
        screen.getByTestId('crm-card-interacciones'),
        screen.getByTestId('crm-card-campanas'),
      ];
      expect(cards).toHaveLength(5);
      cards.forEach((card) => expect(card).toBeInTheDocument());
    });

    it('AT-FC11-A-WEB-2: click en tarjeta Contratos navega a /dashboard/contracts', () => {
      renderHub();
      fireEvent.click(screen.getByTestId('crm-card-contratos-btn'));
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/contracts');
    });

    it('AT-FC11-A-WEB-3: data-testid "crm-hub" presente en el contenedor raíz', () => {
      renderHub();
      expect(screen.getByTestId('crm-hub')).toBeInTheDocument();
    });

    it('AT-FC11-A-WEB-4: todos los botones de tarjeta contienen el texto "ABRIR MÓDULO"', () => {
      renderHub();
      const buttons = screen.getAllByText(/ABRIR MÓDULO/i);
      expect(buttons).toHaveLength(5);
    });

    it('AT-FC11-A-WEB-5: setSectionData es llamado con "CRM" al montar el componente', () => {
      renderHub();
      expect(setSectionDataMock).toHaveBeenCalledWith(
        'CRM',
        'Gestión de Relaciones con Clientes',
        null
      );
    });
  });

  describe('FaseB — Guards de permiso por tarjeta', () => {
    it('AT-FC11-B-WEB-1: Campañas oculta para usuario con fleet:view y !isOmnipotent', () => {
      usePermissionsMock.mockReturnValue(fleetOnlyPermissions);
      renderHub();
      expect(screen.queryByTestId('crm-card-campanas')).toBeNull();
      expect(screen.getByTestId('crm-card-directorio')).toBeInTheDocument();
    });

    it('AT-FC11-B-WEB-2: Omnipotente ve las 5 tarjetas (incluye Campañas)', () => {
      usePermissionsMock.mockReturnValue(fullPermissions);
      renderHub();
      expect(screen.getByTestId('crm-card-campanas')).toBeInTheDocument();
      expect(screen.getAllByText(/ABRIR MÓDULO/i)).toHaveLength(5);
    });

    it('AT-FC11-B-WEB-3: sin fleet:view y !isOmnipotent redirige a /dashboard', () => {
      usePermissionsMock.mockReturnValue(noPermissions);
      renderHub();
      expect(navigateMock).toHaveBeenCalledWith('/dashboard');
    });

    it('AT-FC11-B-WEB-4: usuario con fleet:view ve exactamente 4 tarjetas (sin Campañas)', () => {
      usePermissionsMock.mockReturnValue(fleetOnlyPermissions);
      renderHub();
      const buttons = screen.getAllByText(/ABRIR MÓDULO/i);
      expect(buttons).toHaveLength(4);
      expect(screen.queryByTestId('crm-card-campanas')).toBeNull();
    });
  });
});
