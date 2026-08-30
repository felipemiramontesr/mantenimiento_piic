import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '../../test/testUtils';
import { FleetContext } from '../../context/FleetContext';
import ArchonCenter from './ArchonCenter';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    post: vi.fn(),
  },
}));

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (): Promise<unknown> => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../components/Identity/AccessControlSlideOver', () => ({
  default: ({ onClose }: { isOpen: boolean; onClose: () => void }): React.JSX.Element => (
    <button data-testid="mock-access-control-close" onClick={onClose}>
      close
    </button>
  ),
}));

describe('ArchonCenter Component (Apex Standard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModule = async (): Promise<void> => {
    await act(async () => {
      render(<ArchonCenter />);
    });
  };

  it('renders branding name and command titles', async () => {
    await renderModule();
    expect(await screen.findByText('Centro de Comando')).toBeDefined();
    expect(await screen.findByText('Análisis Predictivo de Segmentos Operativos')).toBeDefined();
  });

  it('renders 6 KPI cards with correct text in Spanish', async () => {
    await renderModule();

    expect(screen.getByText(/Salud de Flota/i)).toBeDefined();
    expect(screen.getByText(/Fuerza Operativa/i)).toBeDefined();
    expect(screen.getAllByText(/Disponibilidad/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Despliegue en Ruta/i)).toBeDefined();
    expect(screen.getByText(/Mermas Operativas/i)).toBeDefined();
    expect(screen.getByText(/Incidencias en Ruta/i)).toBeDefined();

    const detailButtons = screen.getAllByRole('button', { name: /VER REPORTE/i });
    expect(detailButtons.length).toBe(6);
  });

  it('renders the KPI skeleton (pulse placeholder) while fleet stats are loading', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loadingFleet: any = {
      units: [],
      stats: {
        total: 0,
        available: 0,
        inRoute: 0,
        maintenance: 0,
        discontinued: 0,
        totalInactive: 0,
        maintenanceIndex: 0,
        openIncidents: 0,
        globalMTBF: 0,
        globalMTTR: 0,
        globalAvailability: 100,
        categories: {
          vehiculo: { total: 0, active: 0, health: 0 },
          maquinaria: { total: 0, active: 0, health: 0 },
          herramienta: { total: 0, active: 0, health: 0 },
        },
      },
      loading: true,
      refreshUnits: vi.fn(),
      startRoute: vi.fn(),
      finishRoute: vi.fn(),
      reportIncident: vi.fn(),
      getUnitDetails: vi.fn(),
    };
    await act(async () => {
      render(
        <FleetContext.Provider value={loadingFleet}>
          <ArchonCenter />
        </FleetContext.Provider>
      );
    });
    expect(screen.queryByText(/Fuerza Operativa/i)).not.toBeNull();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('renders the 3 main category cards with 2x2 grid', async () => {
    await renderModule();

    expect(screen.getByText('Vehículos de Flota')).toBeDefined();
    expect(screen.getByText('Maquinaria Pesada')).toBeDefined();
    expect(screen.getByText('Herramienta Menor')).toBeDefined();

    expect(screen.getAllByText(/Segmento Operativo/i).length).toBe(3);
  });

  it('navigates to the KPI path when a "VER REPORTE" button is clicked', async () => {
    await renderModule();

    const detailButtons = screen.getAllByRole('button', { name: /VER REPORTE/i });
    fireEvent.click(detailButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/users');
  });

  it('navigates to the category path when "VER DETALLES" is clicked', async () => {
    await renderModule();

    const viewDetailsButtons = screen.getAllByRole('button', { name: /VER DETALLES/i });
    fireEvent.click(viewDetailsButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/fleet?categoria=vehiculo');
  });

  it('closes the access control slide-over without throwing', async () => {
    await renderModule();

    fireEvent.click(screen.getByTestId('mock-access-control-close'));

    expect(screen.getByTestId('mock-access-control-close')).toBeInTheDocument();
  });
});
