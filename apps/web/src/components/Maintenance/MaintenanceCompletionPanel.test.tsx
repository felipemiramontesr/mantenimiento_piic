/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import server from '../../test/server';
import MaintenanceCompletionPanel from './MaintenanceCompletionPanel';

const noop = (): void => undefined;

const ACTIVE_LOG = {
  id: 1,
  uuid: 'uuid-active-001',
  unit_id: 'ASM-001',
  service_date: '2026-05-29',
  odometer_at_service: 50000,
  odometer_at_close: null,
  fuel_level_start: 75,
  fuel_level_end: null,
  fuel_liters_loaded: null,
  fuel_amount: null,
  service_type: 'ADVANCED_50K',
  service_mode: 'WORKSHOP',
  system_recommended_type: 'ADVANCED_50K',
  cost: 4500,
  technician: 'Carlos López',
  created_at: '2026-05-29T10:00:00Z',
  start_at: '2026-05-29T08:00:00Z',
  end_at: null,
  movement_status: 'ACTIVE',
};

describe('MaintenanceCompletionPanel', () => {
  beforeEach(() => {
    server.use(
      http.get('*/maintenance/template/*', () =>
        HttpResponse.json({
          success: true,
          tasks: [
            {
              code: 'OIL_CHANGE',
              label: 'Cambio de aceite',
              isCritical: true,
              isDeferredCarry: false,
            },
            {
              code: 'OIL_FILTER',
              label: 'Filtro de aceite',
              isCritical: false,
              isDeferredCarry: false,
            },
          ],
        })
      ),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [] }))
    );
  });

  it('renders the context banner with unit_id and service type', async () => {
    render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
    await waitFor(() => expect(screen.getByText(/cerrar servicio de taller/i)).toBeInTheDocument());
    expect(screen.getByText(/ASM-001/)).toBeInTheDocument();
  });

  it('renders the checklist tasks after template loads', async () => {
    render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
    await waitFor(() => expect(screen.getByText('Cambio de aceite')).toBeInTheDocument());
    expect(screen.getByText('Filtro de aceite')).toBeInTheDocument();
  });

  it('shows entry odometer from log', async () => {
    render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
    await waitFor(() => expect(screen.getAllByText(/50[.,]000/).length).toBeGreaterThan(0));
  });

  it('calls onCancel when Cancelar is clicked', async () => {
    let cancelled = false;
    render(
      <MaintenanceCompletionPanel
        log={ACTIVE_LOG}
        onSuccess={noop}
        onCancel={(): void => {
          cancelled = true;
        }}
      />
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(cancelled).toBe(true);
  });

  it('submits PATCH request with correct UUID on Finalizar', async () => {
    let patchedUuid: string | null = null;
    server.use(
      http.patch('*/maintenance/:uuid/complete', ({ params }) => {
        patchedUuid = params.uuid as string;
        return HttpResponse.json({ success: true });
      })
    );
    let succeeded = false;
    render(
      <MaintenanceCompletionPanel
        log={ACTIVE_LOG}
        onSuccess={(): void => {
          succeeded = true;
        }}
        onCancel={noop}
      />
    );
    await waitFor(() => expect(screen.getByText('Cambio de aceite')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /finalizar/i }));
    await waitFor(() => expect(succeeded).toBe(true));
    expect(patchedUuid).toBe('uuid-active-001');
  });

  // ── FC 074 F4 — Formularios_Y_Detalles_Apilables ──
  describe('AT-FC074-F4 — mobile-first form hardening', () => {
    it('AT-FC074-F4-MC-1: la fila de detalle de tarea (estatus/notas) apila a 1 columna <md', async () => {
      render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
      await waitFor(() => expect(screen.getByText('Cambio de aceite')).toBeInTheDocument());
      const notesInput = screen.getAllByPlaceholderText('Notas...')[0];
      const grid = notesInput.closest('.grid.grid-cols-1');
      expect(grid).not.toBeNull();
      expect(grid?.className).toMatch(/md:grid-cols-2/);
    });

    it('AT-FC074-F4-MC-2: los inputs de odómetro (entrada/salida) declaran inputMode numeric', async () => {
      render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
      expect(await screen.findByPlaceholderText('Ej: 126500')).toHaveAttribute(
        'inputmode',
        'numeric'
      );
      expect(screen.getByPlaceholderText('Ej: 126680')).toHaveAttribute('inputmode', 'numeric');
    });

    it('AT-FC074-F4-MC-3: el input de costo final declara inputMode decimal', async () => {
      render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
      expect(await screen.findByPlaceholderText('Ej: 3,450.00')).toHaveAttribute(
        'inputmode',
        'decimal'
      );
    });

    it('AT-FC074-F4-MC-4: la barra de acciones (Cancelar/Finalizar) es sticky bottom en móvil', async () => {
      render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
      const cancelBtn = await screen.findByText(/Cancelar/i);
      const actionBar = cancelBtn.closest('.archon-grid-2-sovereign');
      expect(actionBar?.className).toMatch(/\bsticky\b/);
      expect(actionBar?.className).toMatch(/bottom-0/);
    });
  });
});
