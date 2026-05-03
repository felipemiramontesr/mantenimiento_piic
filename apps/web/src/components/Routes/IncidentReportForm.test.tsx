import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IncidentReportForm from './IncidentReportForm';
import { FleetContext } from '../../context/FleetContext';

describe('IncidentReportForm (Sentinel Protocol)', () => {
  const mockReportIncident = vi.fn().mockResolvedValue(undefined);
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const fleetContextValue = {
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
      globalAvailability: 0,
      categories: {
        vehiculo: {
          count: 0,
          availablePercent: 0,
          maintenanceCount: 0,
          avgMtbf: 0,
          avgMttr: 0,
          backlog: 0,
        },
        maquinaria: {
          count: 0,
          availablePercent: 0,
          maintenanceCount: 0,
          avgMtbf: 0,
          avgMttr: 0,
          backlog: 0,
        },
        herramienta: {
          count: 0,
          availablePercent: 0,
          maintenanceCount: 0,
          avgMtbf: 0,
          avgMttr: 0,
          backlog: 0,
        },
      },
    },
    loading: false,
    refreshUnits: vi.fn().mockResolvedValue(undefined),
    startRoute: vi.fn().mockResolvedValue(undefined),
    finishRoute: vi.fn().mockResolvedValue(undefined),
    reportIncident: mockReportIncident,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form correctly with industrial aesthetics', () => {
    render(
      <FleetContext.Provider value={fleetContextValue}>
        <IncidentReportForm
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          routeUuid="test-uuid"
          unitId="ASM-001"
        />
      </FleetContext.Provider>
    );

    expect(screen.getByText(/Protocolo Sentinel: Alerta de Incidencia/i)).toBeDefined();
    expect(
      screen.getByPlaceholderText(/Describa el evento, ubicación y estado de la unidad/i)
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /Emitir Alerta Sentinel/i })).toBeDefined();
  });

  it('validates required fields before submission', async () => {
    render(
      <FleetContext.Provider value={fleetContextValue}>
        <IncidentReportForm
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          routeUuid="test-uuid"
          unitId="ASM-001"
        />
      </FleetContext.Provider>
    );

    const submitBtn = screen.getByRole('button', { name: /Emitir Alerta Sentinel/i });
    // Button is disabled when description is empty
    expect(submitBtn).toBeDisabled();
  });

  it('submits correctly when fields are filled', async () => {
    render(
      <FleetContext.Provider value={fleetContextValue}>
        <IncidentReportForm
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          routeUuid="test-uuid"
          unitId="ASM-001"
        />
      </FleetContext.Provider>
    );

    // Fill description
    const desc = screen.getByPlaceholderText(
      /Describa el evento, ubicación y estado de la unidad/i
    );
    fireEvent.change(desc, { target: { value: 'Falla en motor de arranque' } });

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Emitir Alerta Sentinel/i });
    expect(submitBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockReportIncident).toHaveBeenCalledWith(
        'test-uuid',
        expect.objectContaining({
          category: 'MECANICA',
          description: 'Falla en motor de arranque',
          severity: 'MEDIUM', // Default in component
        })
      );
    });

    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles image upload via Base64 integration', async () => {
    // This would test the ArchonImageUploader interaction if mocked or just the state
  });
});
