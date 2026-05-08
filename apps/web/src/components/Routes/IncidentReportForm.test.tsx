import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IncidentReportForm from './IncidentReportForm';
import { FleetContext } from '../../context/FleetContext';

/**
 * @file IncidentReportForm.test.tsx
 * @description Suite de validación para el Protocolo Sentinel.
 * Aplica principios DRY al centralizar la hidratación del contexto de prueba.
 */

describe('IncidentReportForm (Sentinel Protocol)', () => {
  const mockReportIncident = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  // 🔱 DRY: Factory para el contexto de flota
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createFleetContext = (overrides = {}): any => ({
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
    refreshUnits: vi.fn(),
    startRoute: vi.fn(),
    finishRoute: vi.fn(),
    reportIncident: mockReportIncident,
    ...overrides,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderForm = (contextValue = createFleetContext()): any =>
    render(
      <FleetContext.Provider value={contextValue}>
        <IncidentReportForm
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          routeUuid="test-uuid"
          unitId="ASM-001"
        />
      </FleetContext.Provider>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockReportIncident.mockResolvedValue(undefined);
  });

  it('renders the form correctly with industrial aesthetics', () => {
    renderForm();
    expect(screen.getByText(/Protocolo Sentinel: Alerta de Incidencia/i)).toBeDefined();
    expect(
      screen.getByPlaceholderText(/Describa el evento, ubicación y estado de la unidad/i)
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /Emitir Alerta Sentinel/i })).toBeDefined();
  });

  it('validates required fields: submission button should be disabled when empty', () => {
    renderForm();
    const submitBtn = screen.getByRole('button', { name: /Emitir Alerta Sentinel/i });
    expect(submitBtn).toBeDisabled();
  });

  it('executes forensic submission correctly when fields are filled', async () => {
    renderForm();

    const desc = screen.getByPlaceholderText(
      /Describa el evento, ubicación y estado de la unidad/i
    );
    fireEvent.change(desc, { target: { value: 'Falla crítica en transmisión' } });

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
          description: 'Falla crítica en transmisión',
          severity: 'MEDIUM',
        })
      );
    });

    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles transmission failures (Sentinel Fault Recovery)', async () => {
    const errorMsg = 'Error de red en Protocolo Sentinel';
    mockReportIncident.mockRejectedValue(new Error(errorMsg));

    renderForm();

    const desc = screen.getByPlaceholderText(
      /Describa el evento, ubicación y estado de la unidad/i
    );
    fireEvent.change(desc, { target: { value: 'Evento de prueba' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Emitir Alerta Sentinel/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(new RegExp(errorMsg, 'i'))).toBeDefined();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('allows category and severity selection switching', async () => {
    renderForm();

    // Seleccionar Siniestro
    const siniestroBtn = screen.getByText(/Siniestro \/ Accidente/i);
    fireEvent.click(siniestroBtn);

    // Seleccionar Crítica
    const criticaBtn = screen.getByText(/CRÍTICA/i);
    fireEvent.click(criticaBtn);

    const desc = screen.getByPlaceholderText(
      /Describa el evento, ubicación y estado de la unidad/i
    );
    fireEvent.change(desc, { target: { value: 'Accidente total' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Emitir Alerta Sentinel/i }));
    });

    await waitFor(() => {
      expect(mockReportIncident).toHaveBeenCalledWith(
        'test-uuid',
        expect.objectContaining({
          category: 'SINIESTRO',
          severity: 'CRITICAL',
        })
      );
    });
  });
});
