/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import server from '../../test/server';
import MaintenanceCompletionPanel from './MaintenanceCompletionPanel';
import { UserContext } from '../../context/UserContext';

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

  // ── R4-C Fc162 — Sonar unc lines 113-115,145,156,226,247,264,282,299,345,361,417,425 ──
  describe('R4-C — form field onChange handlers, handleDetailChange, catch de handleSubmit', () => {
    it('editing odómetros, fecha, costo y litros/monto de combustible actualiza sus valores', async () => {
      render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
      await waitFor(() => expect(screen.getByText('Cambio de aceite')).toBeInTheDocument());

      const entryOdometer = screen.getByPlaceholderText('Ej: 126500');
      fireEvent.change(entryOdometer, { target: { value: '51000' } });
      expect(entryOdometer).toHaveValue(51000);

      const exitOdometer = screen.getByPlaceholderText('Ej: 126680');
      fireEvent.change(exitOdometer, { target: { value: '51200' } });
      expect(exitOdometer).toHaveValue(51200);

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2026-05-30' } });
      expect(dateInput).toHaveValue('2026-05-30');

      const costInput = screen.getByPlaceholderText('Ej: 3,450.00');
      fireEvent.change(costInput, { target: { value: '5000' } });
      expect(costInput).toHaveValue(5000);

      const [litersInput, amountInput] = screen.getAllByPlaceholderText('0.00');
      fireEvent.change(litersInput, { target: { value: '20.5abc' } });
      expect(litersInput).toHaveValue('20.5');

      fireEvent.change(amountInput, { target: { value: '99xyz' } });
      expect(amountInput).toHaveValue('99');
    });

    it('seleccionar un técnico y editar el estatus/notas de una tarea actualiza sus valores', async () => {
      render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
      await waitFor(() => expect(screen.getByText('Cambio de aceite')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Carlos López'));
      fireEvent.click(await screen.findByText('Pedro Técnico'));
      expect(screen.getByText('Pedro Técnico')).toBeInTheDocument();

      const statusTriggers = screen.getAllByText('Correcto');
      fireEvent.click(statusTriggers[0]);
      fireEvent.click(await screen.findByText('Reemplazado'));

      const notesInputs = screen.getAllByPlaceholderText('Notas...');
      fireEvent.change(notesInputs[0], { target: { value: 'Se cambió sin problema' } });
      expect(notesInputs[0]).toHaveValue('Se cambió sin problema');
    });

    it('muestra el mensaje de error específico del backend cuando el PATCH falla', async () => {
      server.use(
        http.patch('*/maintenance/:uuid/complete', () =>
          HttpResponse.json({ error: 'Servicio ya cerrado' }, { status: 400 })
        )
      );
      render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
      await waitFor(() => expect(screen.getByText('Cambio de aceite')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /finalizar/i }));
      expect(await screen.findByText('Servicio ya cerrado')).toBeInTheDocument();
    });
  });
});

/**
 * FC165 F2 Slice 2.1B (2/3) — branch coverage completion. 28 uncovered
 * conditions (live count; Alfa's census had 25). 1 residual left
 * undocumented-but-untested: `details[idx]?.status || 'PASS'` (line 416) —
 * `details` is always built from the exact same `template` response in the
 * same `.then()`, same length/order, so `details[idx]` can never genuinely
 * be undefined for a rendered `idx` through the real data flow; no
 * artificial test written for it (0 v8-ignore either way — just documented
 * here, matching the FleetGridView.tsx 3-residual precedent from Slice 2.1A,
 * pasada posterior per Bravo 249_AN's criterion). The other 27 are covered
 * below with real assertions.
 */
describe('MaintenanceCompletionPanel — branch coverage (FC165 F2 Slice 2.1B)', () => {
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
          ],
        })
      ),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [] }))
    );
  });

  it('falls back to 0/blank defaults for a log missing odometer/cost/technician/fuel data, and blocks submit while canSubmit is false', async () => {
    const SPARSE_LOG = {
      ...ACTIVE_LOG,
      odometer_at_service: 0,
      cost: 0,
      technician: null,
      fuel_level_start: null,
    };
    let patchCalled = false;
    server.use(
      http.patch('*/maintenance/:uuid/complete', () => {
        patchCalled = true;
        return HttpResponse.json({ success: true });
      })
    );
    const { container } = render(
      <MaintenanceCompletionPanel log={SPARSE_LOG} onSuccess={noop} onCancel={noop} />
    );
    await waitFor(() => expect(screen.getByText('Cambio de aceite')).toBeInTheDocument());

    expect(screen.getByPlaceholderText('Ej: 126500')).toHaveValue(null);
    expect(screen.getByPlaceholderText('Ej: 126680')).toHaveValue(null);
    expect(screen.getByPlaceholderText('Ej: 3,450.00')).toHaveValue(null);

    // canSubmit=false (odometerAtService=0) — fireEvent.submit bypasses the
    // disabled submit button to exercise the `if (!canSubmit) return;` guard
    // directly, the same way a stray Enter-key form submission would.
    const form = container.querySelector('form');
    fireEvent.submit(form);
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(patchCalled).toBe(false);
  });

  it('omits technician from the payload when the log has none and it is never selected', async () => {
    const NO_TECH_LOG = { ...ACTIVE_LOG, technician: null };
    let capturedBody = null;
    server.use(
      http.patch('*/maintenance/:uuid/complete', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    render(<MaintenanceCompletionPanel log={NO_TECH_LOG} onSuccess={noop} onCancel={noop} />);
    await waitFor(() => expect(screen.getByText('Cambio de aceite')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /finalizar/i }));
    await waitFor(() => expect(capturedBody).not.toBeNull());
    expect(capturedBody.technician).toBeUndefined();
  });

  it('leaves template/details empty when GET /maintenance/template responds success:false', async () => {
    server.use(http.get('*/maintenance/template/*', () => HttpResponse.json({ success: false })));
    render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
    await waitFor(() => {
      expect(screen.getByText('No se encontraron tareas para este servicio.')).toBeInTheDocument();
    });
  });

  it('technicianOptions falls back to [] when users is null', async () => {
    render(
      <UserContext.Provider value={{ users: null } as any}>
        <MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />
      </UserContext.Provider>
    );
    await waitFor(() => expect(screen.getByText('Cambio de aceite')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Carlos López'));
    expect(screen.queryByText('Pedro Técnico')).not.toBeInTheDocument();
  });

  it('technicianOptions falls back to username/S-N/GENERAL for sparse técnico records', async () => {
    const sparseUsers = [
      { id: '9', username: 'sparse.tech', roleName: 'Técnico Especialista', is_active: true },
      {
        id: '10',
        fullName: 'Ana SinUsername',
        roleName: 'Técnico Especialista',
        is_active: true,
        employeeNumber: 'EMP-010',
        department: 'Taller',
      },
    ];
    render(
      <UserContext.Provider value={{ users: sparseUsers } as any}>
        <MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />
      </UserContext.Provider>
    );
    await waitFor(() => expect(screen.getByText('Cambio de aceite')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Carlos López'));

    expect(await screen.findByText('sparse.tech')).toBeInTheDocument();
    expect(screen.getByText('NÓMINA: S/N | GENERAL')).toBeInTheDocument();
    expect(screen.getByText('Ana SinUsername')).toBeInTheDocument();
  });

  it('includes fuelLitersLoaded/fuelAmount/endOdometer in the payload when they are filled in', async () => {
    let capturedBody = null;
    server.use(
      http.patch('*/maintenance/:uuid/complete', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
    await waitFor(() => expect(screen.getByText('Cambio de aceite')).toBeInTheDocument());

    const exitOdometer = screen.getByPlaceholderText('Ej: 126680');
    fireEvent.change(exitOdometer, { target: { value: '51500' } });

    const [litersInput, amountInput] = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(litersInput, { target: { value: '18.2' } });
    fireEvent.change(amountInput, { target: { value: '450' } });

    fireEvent.click(screen.getByRole('button', { name: /finalizar/i }));
    await waitFor(() => expect(capturedBody).not.toBeNull());
    expect(capturedBody.fuelLitersLoaded).toBe(18.2);
    expect(capturedBody.fuelAmount).toBe(450);
    expect(capturedBody.endOdometer).toBe(51500);
  });

  it('does not call onSuccess when the PATCH responds 200 with success:false', async () => {
    server.use(
      http.patch('*/maintenance/:uuid/complete', () =>
        HttpResponse.json({ success: false, error: 'Rejected' })
      )
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
    const submitBtn = screen.getByRole('button', { name: /finalizar/i });
    fireEvent.click(submitBtn);
    // `finally { setSubmitting(false) }` runs regardless of success:false —
    // re-enabling is the observable signal handleSubmit settled without
    // throwing (success:false is not caught, it just skips onSuccess()).
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    expect(succeeded).toBe(false);
  });

  it('falls back to the generic error message when the PATCH fails with no response body (network error)', async () => {
    server.use(http.patch('*/maintenance/:uuid/complete', () => HttpResponse.error()));
    render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
    await waitFor(() => expect(screen.getByText('Cambio de aceite')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /finalizar/i }));
    expect(
      await screen.findByText('Error al cerrar el servicio. Intente de nuevo.')
    ).toBeInTheDocument();
  });

  it('colors the service-mode badge amber for PARTIAL_EXECUTION (not the default emerald)', async () => {
    const PARTIAL_LOG = { ...ACTIVE_LOG, service_mode: 'PARTIAL_EXECUTION' };
    render(<MaintenanceCompletionPanel log={PARTIAL_LOG} onSuccess={noop} onCancel={noop} />);
    const badge = await screen.findByText('Ejecución Parcial');
    expect(badge.className).toMatch(/text-amber-700/);
  });

  it('renders the ShieldCheck compliance icon for FULL_COMPLIANCE service mode', async () => {
    const FULL_COMPLIANCE_LOG = { ...ACTIVE_LOG, service_mode: 'FULL_COMPLIANCE' };
    const { container } = render(
      <MaintenanceCompletionPanel log={FULL_COMPLIANCE_LOG} onSuccess={noop} onCancel={noop} />
    );
    await waitFor(() => expect(screen.getByText(/cumplimiento total/i)).toBeInTheDocument());
    // this lucide-react build replaces (not appends) the default `lucide-*`
    // class when a custom className is passed — matching on the JSX's own
    // `text-emerald-500` className is the reliable selector here.
    expect(container.querySelector('svg.text-emerald-500')).toBeTruthy();
  });

  it('shows the "Diferido" badge for a task carried over as isDeferredCarry', async () => {
    server.use(
      http.get('*/maintenance/template/*', () =>
        HttpResponse.json({
          success: true,
          tasks: [
            {
              code: 'BRAKE_CHECK',
              label: 'Revisión de frenos',
              isCritical: false,
              isDeferredCarry: true,
            },
          ],
        })
      )
    );
    render(<MaintenanceCompletionPanel log={ACTIVE_LOG} onSuccess={noop} onCancel={noop} />);
    await waitFor(() => expect(screen.getByText('Revisión de frenos')).toBeInTheDocument());
    expect(screen.getByText('↩ Diferido')).toBeInTheDocument();
  });
});
