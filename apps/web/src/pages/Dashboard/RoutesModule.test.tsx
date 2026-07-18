import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test/testUtils';
import server from '../../test/server';
import { SovereignLayoutProvider } from '../../context/SovereignLayoutContext';
import RoutesModule from './RoutesModule';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stableUnits: any[] = [];
vi.mock('../../context/FleetContext', async () => {
  const actual = await vi.importActual('../../context/FleetContext');
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useFleet: (): any => ({
      units: stableUnits,
      refreshUnits: vi.fn(),
      loading: false,
    }),
  };
});

describe('RoutesModule Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the routes module correctly', () => {
    const { container } = render(
      <SovereignLayoutProvider>
        <RoutesModule />
      </SovereignLayoutProvider>
    );
    expect(container).toBeInTheDocument();
  });

  // ── FC 078 F2(a)/(b) — Adopcion_Adaptativa_Completa: LOGS TABLE + CARDS ──
  describe('AT-FC078-F2a — adaptive LOGS panel', () => {
    const routeLog = {
      id: '1',
      uuid: 'route-uuid-1',
      unit_id: 'ASM-001',
      operator_id: '1',
      origin: 'Base',
      destination: 'Cliente A',
      start_time: '2026-06-01T08:00:00.000Z',
      end_time: null,
      start_km: 50000,
      end_km: null,
    };

    beforeEach(() => {
      localStorage.clear();
      stableUnits.length = 0;
      stableUnits.push({
        id: 'ASM-001',
        marca: 'Nissan',
        modelo: 'March',
        status: 'En Ruta',
        odometer: 50000,
        placas: 'ABC-123',
      });
      server.use(
        http.get('*/routes', () => HttpResponse.json({ success: true, data: [routeLog] }))
      );
    });

    afterEach(() => {
      stableUnits.length = 0;
    });

    const renderModule = (): void => {
      render(<RoutesModule />);
    };

    it('AT-FC078-F2a-RT-1: renders the adaptive selector with TABLE and CARDS only', async () => {
      renderModule();
      await screen.findByTestId('adaptive-view-table');
      expect(screen.getByTestId('adaptive-view-cards')).toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-calendar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-charts')).not.toBeInTheDocument();
    });

    it('AT-FC078-F2a-RT-2: switches to CARDS view and renders enriched route cards', async () => {
      renderModule();
      await screen.findByTestId('adaptive-view-cards');
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      expect(await screen.findByTestId('archon-card-view')).toBeInTheDocument();
      expect(screen.getByText('Cliente A')).toBeInTheDocument();
      expect(screen.getByText('En Ruta')).toBeInTheDocument();
    });

    it('AT-FC078-F2a-RT-3: Editar Ruta button inside a card triggers onEdit (onClick preservado)', async () => {
      renderModule();
      await screen.findByTestId('adaptive-view-cards');
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      const editBtn = await screen.findByRole('button', { name: /Editar Ruta/i });
      // FC 078 F4 — regresión atrapada por I-RWD: el botón medía 86×22 (<44px táctil)
      expect(editBtn.className).toContain('h-11');
      fireEvent.click(editBtn);
      // handleEdit → DISPATCH panel renders RouteAssignmentForm
      expect(await screen.findByText(/Cerrar Formulario/i)).toBeInTheDocument();
    });

    // Regresión real hallada en el barrido Cond.4 (datos de seed con
    // start_km undefined) — RouteLogTable.tsx ya usaba `?.` para esto;
    // renderRouteCardContent no lo tenía y tumbaba el módulo completo.
    it('AT-FC078-F2a-RT-4: does not crash when start_km/end_km are undefined', async () => {
      server.use(
        http.get('*/routes', () =>
          HttpResponse.json({
            success: true,
            data: [{ ...routeLog, start_km: undefined, end_km: undefined }],
          })
        )
      );
      renderModule();
      await screen.findByTestId('adaptive-view-cards');
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      expect(await screen.findByTestId('archon-card-view')).toBeInTheDocument();
      expect(screen.getByText('0 (en curso)')).toBeInTheDocument();
    });
  });
});
