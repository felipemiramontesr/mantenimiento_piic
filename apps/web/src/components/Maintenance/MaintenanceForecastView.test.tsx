/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor } from '../../test/testUtils';
import server from '../../test/server';
import MaintenanceForecastView from './MaintenanceForecastView';

const noop = (): void => undefined;

// ── Fixture rows ─────────────────────────────────────────────────────────────

const CRITICAL_ROW = {
  unitId: 'ASM-001',
  marca: 'Nissan',
  modelo: 'March',
  departamento: 'MINA',
  currentOdometer: 49800,
  dailyUsageAvg: 120,
  nextKmReading: 50000,
  kmRemaining: 200,
  nextServiceDate: '2026-05-30',
  daysUntilService: 2,
  triggerType: 'KM',
  projectedOdometer: 50000,
  projectedServiceType: 'ADVANCED_50K',
  urgency: 'CRITICAL',
};

const WARNING_ROW = {
  unitId: 'ASM-010',
  marca: 'Toyota',
  modelo: 'Hilux',
  departamento: 'AGENCIA',
  currentOdometer: 28500,
  dailyUsageAvg: 80,
  nextKmReading: 30000,
  kmRemaining: 1500,
  nextServiceDate: '2026-06-10',
  daysUntilService: 15,
  triggerType: 'KM',
  projectedOdometer: 30000,
  projectedServiceType: 'MAJOR_30K',
  urgency: 'WARNING',
};

const OK_ROW = {
  unitId: 'ASM-020',
  marca: 'Ford',
  modelo: 'Ranger',
  departamento: 'MINA',
  currentOdometer: 5000,
  dailyUsageAvg: 30,
  nextKmReading: 10000,
  kmRemaining: 5000,
  nextServiceDate: '2026-09-01',
  daysUntilService: 120,
  triggerType: 'DATE',
  projectedOdometer: 10000,
  projectedServiceType: 'BASIC_10K',
  urgency: 'OK',
};

const MINE_ROW = {
  unitId: 'ASM-030',
  marca: 'Caterpillar',
  modelo: '420E',
  departamento: 'MINA',
  currentOdometer: 15200,
  dailyUsageAvg: 50,
  nextKmReading: 15000,
  kmRemaining: -200,
  nextServiceDate: '2026-05-25',
  daysUntilService: -3,
  triggerType: 'KM',
  projectedOdometer: 15000,
  projectedServiceType: 'MINOR_MINING',
  urgency: 'CRITICAL',
};

const renderForecast = (): void => {
  render(<MaintenanceForecastView onScheduleRequest={noop} />);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MaintenanceForecastView', () => {
  beforeEach(() => {
    server.use(
      http.get('*/maintenance/forecast', () => HttpResponse.json({ success: true, data: [] }))
    );
  });

  // ── Loading / empty states ─────────────────────────────────────────────────
  it('shows loading skeleton before data arrives', () => {
    server.use(
      http.get(
        '*/maintenance/forecast',
        () => new Promise(() => undefined) // never resolves
      )
    );
    renderForecast();
    expect(screen.getByText('Calculando pronósticos de flotilla...')).toBeInTheDocument();
  });

  it('shows empty message when API returns no units', async () => {
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('NO SE ENCONTRARON UNIDADES ACTIVAS')).toBeInTheDocument();
    });
  });

  it('shows error message when API call fails', async () => {
    server.use(http.get('*/maintenance/forecast', () => HttpResponse.error()));
    renderForecast();
    await waitFor(() => {
      expect(
        screen.getByText('Error al recuperar pronósticos de mantenimiento.')
      ).toBeInTheDocument();
    });
  });

  // ── Urgency badges ─────────────────────────────────────────────────────────
  it('renders CRITICAL badge for an overdue unit', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Crítico')).toBeInTheDocument();
    });
  });

  it('renders WARNING (Próximo) badge for a near-due unit', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Próximo')).toBeInTheDocument();
    });
  });

  it('renders OK (Al Día) badge for a healthy unit', async () => {
    server.use(
      http.get('*/maintenance/forecast', () => HttpResponse.json({ success: true, data: [OK_ROW] }))
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Al Día')).toBeInTheDocument();
    });
  });

  // ── Service type labels ────────────────────────────────────────────────────
  it('renders "Avanzado 50K - 60K" label for ADVANCED_50K service type', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Avanzado 50K - 60K')).toBeInTheDocument();
    });
  });

  it('renders "Mayor 30K - 40K" label for MAJOR_30K service type', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Mayor 30K - 40K')).toBeInTheDocument();
    });
  });

  it('renders "Básico 10K" label for BASIC_10K service type', async () => {
    server.use(
      http.get('*/maintenance/forecast', () => HttpResponse.json({ success: true, data: [OK_ROW] }))
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Básico 10K')).toBeInTheDocument();
    });
  });

  it('renders "Servicio Menor" label for MINOR_MINING service type', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [MINE_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Servicio Menor')).toBeInTheDocument();
    });
  });

  // ── Date formatting ─────────────────────────────────────────────────────────
  it('formats next service date as DD/MM/YYYY', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW] })
      )
    );
    renderForecast();
    // CRITICAL_ROW.nextServiceDate = '2026-05-30' → should display '30/05/2026'
    await waitFor(() => {
      expect(screen.getByText('30/05/2026')).toBeInTheDocument();
    });
  });

  // ── Trigger type indicator ─────────────────────────────────────────────────
  it('shows "Kilometraje" trigger for KM-triggered forecast', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Kilometraje')).toBeInTheDocument();
    });
  });

  it('shows "Fecha" trigger for DATE-triggered forecast', async () => {
    server.use(
      http.get('*/maintenance/forecast', () => HttpResponse.json({ success: true, data: [OK_ROW] }))
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Fecha')).toBeInTheDocument();
    });
  });

  // ── Unit info rendering ────────────────────────────────────────────────────
  it('renders unit ID in the row', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('ASM-010')).toBeInTheDocument();
    });
  });

  it('renders unit brand and model', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Toyota Hilux')).toBeInTheDocument();
    });
  });

  it('renders department badge', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('AGENCIA')).toBeInTheDocument();
    });
  });

  // ── Multiple rows ──────────────────────────────────────────────────────────
  it('renders all three urgency levels when data contains mixed rows', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW, WARNING_ROW, OK_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Crítico')).toBeInTheDocument();
      expect(screen.getByText('Próximo')).toBeInTheDocument();
      expect(screen.getByText('Al Día')).toBeInTheDocument();
    });
  });

  it('renders a "Programar" button for each row', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW, WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /Programar/i });
      expect(buttons).toHaveLength(2);
    });
  });

  // ── Unit image from FleetContext ───────────────────────────────────────────
  it('renders placeholder image when unit has no images in FleetContext', async () => {
    // MockFleetContext unit ASM-001 has no images array
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      const placeholder = screen.getByAltText('Archon Unit Placeholder');
      expect(placeholder).toBeInTheDocument();
    });
  });

  // ── Odometer display ───────────────────────────────────────────────────────
  it('renders odometer reading with km suffix', async () => {
    server.use(
      http.get('*/maintenance/forecast', () => HttpResponse.json({ success: true, data: [OK_ROW] }))
    );
    renderForecast();
    // OK_ROW has currentOdometer=5000 and kmRemaining=5000 — both cells show "5,000 km"
    await waitFor(() => {
      const matches = screen.getAllByText(/5[.,]000 km/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Out-of-domain resilience (FC 071 F2 — root-cause mechanism) ────────────
  // Terreno: una fila con urgency/projectedServiceType fuera de los mapas
  // (URGENCY_META/SERVICE_BADGE) reventaba el render (`undefined.bg`) y, sin
  // ErrorBoundary, React desmontaba el root completo (pantalla blanca — CI run 4).
  it('renders row with fallback styling instead of crashing on out-of-domain urgency/serviceType (FC 071)', async () => {
    const OUT_OF_DOMAIN_ROW = {
      ...WARNING_ROW,
      unitId: 'ASM-666',
      projectedServiceType: 'FUTURE_TYPE_X',
      urgency: 'MEDIUM',
    };
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [OUT_OF_DOMAIN_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('ASM-666')).toBeInTheDocument();
    });
    // El valor desconocido se muestra tal cual (fallback), nunca crashea
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('FUTURE_TYPE_X')).toBeInTheDocument();
  });

  it('renders mixed valid and out-of-domain rows without unmounting the valid ones (FC 071)', async () => {
    const OUT_OF_DOMAIN_ROW = { ...OK_ROW, unitId: 'ASM-667', urgency: 'UNKNOWN_LEVEL' };
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW, OUT_OF_DOMAIN_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('ASM-001')).toBeInTheDocument();
      expect(screen.getByText('ASM-667')).toBeInTheDocument();
    });
  });
});
