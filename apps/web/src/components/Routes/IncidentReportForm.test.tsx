import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IncidentReportForm from './IncidentReportForm';
import { FleetContext } from '../../context/FleetContext';

// Auto-confirm crop modal so uploader tests work without UI interaction
vi.mock('../ArchonCropModal', () => ({
  default: ({ onConfirm }: { onConfirm: (url: string) => void }): null => {
    onConfirm('data:image/jpeg;base64,mock-cropped');
    return null;
  },
}));

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
      screen.getByPlaceholderText(/Describe la incidencia de forma breve y precisa/i)
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /Emitir Alerta Sentinel/i })).toBeDefined();
  });

  // ── FC 081 F2 — Origen_Corto_Por_Diseño (doctrina cascada Ω nivel 2:
  // el dato nace corto — maxLength solo FE, sin validación API, Cond.2) ──
  describe('AT-FC081-F2 — captura corta por diseño', () => {
    it('AT-FC081-F2-IR-1: el textarea limita a 280 caracteres (maxLength FE)', () => {
      renderForm();
      const textarea = screen.getByPlaceholderText(/Describe la incidencia de forma breve/i);
      expect(textarea.getAttribute('maxLength')).toBe('280');
    });

    it('AT-FC081-F2-IR-2: el contador refleja la longitud escrita (N/280)', () => {
      renderForm();
      expect(screen.getByText('0/280')).toBeDefined();
      const textarea = screen.getByPlaceholderText(/Describe la incidencia de forma breve/i);
      fireEvent.change(textarea, { target: { value: 'Fuga de aceite en motor' } });
      expect(screen.getByText('23/280')).toBeDefined();
    });
  });

  it('validates required fields: submission button should be disabled when empty', () => {
    renderForm();
    const submitBtn = screen.getByRole('button', { name: /Emitir Alerta Sentinel/i });
    expect(submitBtn).toBeDisabled();
  });

  it('executes forensic submission correctly when fields are filled', async () => {
    renderForm();

    const desc = screen.getByPlaceholderText(/Describe la incidencia de forma breve y precisa/i);
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

    const desc = screen.getByPlaceholderText(/Describe la incidencia de forma breve y precisa/i);
    fireEvent.change(desc, { target: { value: 'Evento de prueba' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Emitir Alerta Sentinel/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(new RegExp(errorMsg, 'i'))).toBeDefined();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('evidenceImage onChange with empty array uses empty-string fallback', async () => {
    class MockFR {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onload: any;

      readAsDataURL(): void {
        setTimeout(() => {
          if (this.onload) this.onload({ target: { result: 'data:image/png;base64,m' } });
        }, 0);
      }
    }
    vi.stubGlobal('FileReader', MockFR);

    const { container } = renderForm();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'ev.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for the image preview remove button to appear
    await waitFor(() => {
      expect(container.querySelector('.aspect-square button')).toBeInTheDocument();
    });

    // Click remove → onChange([]) → imgs[0] || '' covers the empty-string fallback
    const removeBtn = container.querySelector('.aspect-square button') as HTMLButtonElement;
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(container.querySelector('.aspect-square button')).not.toBeInTheDocument();
    });
  });

  it('shows Transmitiendo text while submitting and blocks second submission', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockReportIncident.mockImplementation(() => new Promise(() => {}));
    const { container } = renderForm();

    const desc = screen.getByPlaceholderText(/Describe la incidencia de forma breve y precisa/i);
    fireEvent.change(desc, { target: { value: 'Test doble envío' } });

    // First click: submitting becomes true (line 288 true branch: 'Transmitiendo...')
    fireEvent.click(screen.getByRole('button', { name: /Emitir Alerta Sentinel/i }));

    await waitFor(() => {
      expect(screen.getByText('Transmitiendo...')).toBeInTheDocument();
    });

    // Second form submit while submitting=true → hits line 86 submitting guard → returns early
    fireEvent.submit(container.querySelector('form')!);
    expect(mockReportIncident).toHaveBeenCalledTimes(1);
  });

  it('uses fallback error message when rejection is not an Error instance', async () => {
    mockReportIncident.mockRejectedValue({ code: 500 });
    renderForm();

    const desc = screen.getByPlaceholderText(/Describe la incidencia de forma breve y precisa/i);
    fireEvent.change(desc, { target: { value: 'Error test' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Emitir Alerta Sentinel/i }));
    });

    // err instanceof Error = false → uses fallback string (line 103 false branch)
    await waitFor(() => {
      expect(
        screen.getByText(/Error en la transmisión del protocolo Sentinel/i)
      ).toBeInTheDocument();
    });
  });

  it('allows category and severity selection switching', async () => {
    renderForm();

    // Seleccionar Siniestro
    const siniestroBtn = screen.getByText(/Siniestro \/ Accidente/i);
    fireEvent.click(siniestroBtn);

    // Seleccionar Crítica
    const criticaBtn = screen.getByText(/CRÍTICA/i);
    fireEvent.click(criticaBtn);

    const desc = screen.getByPlaceholderText(/Describe la incidencia de forma breve y precisa/i);
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
