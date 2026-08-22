/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import server from '../../test/server';
import api from '../../api/client';
import MaintenanceHistoryDetail from './MaintenanceHistoryDetail';

const noop = (): void => undefined;

const BASE_LOG = {
  id: 2,
  uuid: 'uuid-completed-002',
  unit_id: 'ASM-010',
  service_date: '2026-05-28',
  odometer_at_service: 30000,
  service_type: 'MAJOR_30K',
  service_mode: 'WORKSHOP',
  system_recommended_type: 'MAJOR_30K',
  cost: 6000,
  technician: 'Ana Martínez',
  created_at: '2026-05-28T09:00:00Z',
  start_at: '2026-05-28T07:00:00Z',
  end_at: '2026-05-28T16:00:00Z',
  movement_status: 'COMPLETED',
};

const DETAIL_RESPONSE = {
  ...BASE_LOG,
  details: [
    {
      taskCode: 'OIL_CHANGE',
      label: 'Cambio de aceite',
      status: 'PASS',
      statusLabel: 'Correcto',
      notes: null,
      isCritical: true,
    },
    {
      taskCode: 'AIR_FILTER_CHANGE',
      label: 'Filtro de aire',
      status: 'REPLACED',
      statusLabel: 'Reemplazado',
      notes: 'Desgaste severo',
      isCritical: false,
    },
    {
      taskCode: 'CABIN_FILTER_CHANGE',
      label: 'Filtro de cabina',
      status: 'DEFERRED',
      statusLabel: 'Diferido',
      notes: null,
      isCritical: false,
    },
  ],
};

describe('MaintenanceHistoryDetail', () => {
  beforeEach(() => {
    server.use(
      http.get('*/maintenance/:uuid', () =>
        HttpResponse.json({ success: true, data: DETAIL_RESPONSE })
      )
    );
  });

  it('renders unit_id and service type in header', async () => {
    render(<MaintenanceHistoryDetail log={BASE_LOG} onBack={noop} />);
    await waitFor(() => expect(document.body.textContent).toContain('ASM-010'));
    expect(screen.getByText(/mayor 30/i)).toBeInTheDocument();
  });

  it('renders all task details after fetch', async () => {
    render(<MaintenanceHistoryDetail log={BASE_LOG} onBack={noop} />);
    await waitFor(() => expect(screen.getByText('Cambio de aceite')).toBeInTheDocument());
    expect(screen.getByText('Filtro de aire')).toBeInTheDocument();
    expect(screen.getByText('Filtro de cabina')).toBeInTheDocument();
  });

  it('shows DEFERRED task badge for deferred items', async () => {
    render(<MaintenanceHistoryDetail log={BASE_LOG} onBack={noop} />);
    await waitFor(() => expect(screen.getByText(/diferido/i)).toBeInTheDocument());
  });

  it('displays technician name', async () => {
    render(<MaintenanceHistoryDetail log={BASE_LOG} onBack={noop} />);
    await waitFor(() => expect(screen.getByText(/Ana Martínez/)).toBeInTheDocument());
  });

  it('calls onBack when Volver button is clicked', async () => {
    let wentBack = false;
    render(
      <MaintenanceHistoryDetail
        log={BASE_LOG}
        onBack={(): void => {
          wentBack = true;
        }}
      />
    );
    await waitFor(() => expect(document.body.textContent).toContain('ASM-010'));
    const backBtn = screen.getByRole('button', { name: /volver/i });
    fireEvent.click(backBtn);
    expect(wentBack).toBe(true);
  });

  it('shows loading state while fetching detail', () => {
    render(<MaintenanceHistoryDetail log={BASE_LOG} onBack={noop} />);
    expect(screen.getAllByText(/cargando/i).length).toBeGreaterThan(0);
  });

  it('shows empty state when details array is empty', async () => {
    server.use(
      http.get('*/maintenance/:uuid', () =>
        HttpResponse.json({ success: true, data: { ...DETAIL_RESPONSE, details: [] } })
      )
    );
    render(<MaintenanceHistoryDetail log={BASE_LOG} onBack={noop} />);
    await waitFor(() =>
      expect(screen.getByText(/Este servicio no tiene tareas registradas/i)).toBeInTheDocument()
    );
  });

  it('renders unknown log service_type as raw value via ?? fallback', async () => {
    render(
      <MaintenanceHistoryDetail
        log={{ ...BASE_LOG, service_type: 'CUSTOM_OVERHAUL' }}
        onBack={noop}
      />
    );
    await waitFor(() => expect(document.body.textContent).toContain('ASM-010'));
    // SERVICE_LABELS['CUSTOM_OVERHAUL'] is undefined → ?? fallback renders raw value
    expect(document.body.textContent).toContain('CUSTOM_OVERHAUL');
  });

  it('renders unknown task status with fallback meta', async () => {
    server.use(
      http.get('*/maintenance/:uuid', () =>
        HttpResponse.json({
          success: true,
          data: {
            ...DETAIL_RESPONSE,
            details: [
              {
                taskCode: 'MYSTERY_TASK',
                label: 'Tarea misteriosa',
                status: 'UNKNOWN_STATUS',
                statusLabel: 'Desconocido',
                notes: null,
                isCritical: false,
              },
            ],
          },
        })
      )
    );
    render(<MaintenanceHistoryDetail log={BASE_LOG} onBack={noop} />);
    await waitFor(() => expect(screen.getByText('Tarea misteriosa')).toBeInTheDocument());
    expect(screen.getByText('Desconocido')).toBeInTheDocument();
  });

  // ── FC 041 F.E — botón Descargar PDF con gate offline (T1) ─────────────────
  it('renders the PDF download button enabled when online', async () => {
    render(<MaintenanceHistoryDetail log={BASE_LOG} onBack={noop} />);
    const btn = await screen.findByTestId('download-pdf-btn');
    expect(btn).toBeEnabled();
    expect(btn.textContent).toContain('Descargar PDF');
  });

  it('disables the PDF button offline with es-MX message (T1 fila ⊤⊥)', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<MaintenanceHistoryDetail log={BASE_LOG} onBack={noop} />);
    const btn = await screen.findByTestId('download-pdf-btn');
    expect(btn).toBeDisabled();
    expect(btn.title).toContain('Acción no disponible en modo sin conexión');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('clicking Descargar PDF fetches the report and triggers an anchor download', async () => {
    // MSW's blob-responseType XHR path is broken in this test runtime (undici
    // "object.stream is not a function"), unrelated to the response body —
    // spy on api.get directly instead of going through the network layer.
    const fakeBlob = new Blob(['fake-pdf-bytes'], { type: 'application/pdf' });
    const apiGetSpy = vi.spyOn(api, 'get').mockImplementation((url: string) => {
      if (url.includes('/pdf')) return Promise.resolve({ data: fakeBlob });
      return Promise.resolve({ data: { success: true, data: DETAIL_RESPONSE } });
    });
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    try {
      render(<MaintenanceHistoryDetail log={BASE_LOG} onBack={noop} />);
      const btn = await screen.findByTestId('download-pdf-btn');
      fireEvent.click(btn);

      await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      expect(clickSpy).toHaveBeenCalled();
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      clickSpy.mockRestore();
      apiGetSpy.mockRestore();
    }
  });
});
