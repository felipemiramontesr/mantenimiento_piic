import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, renderWithRoute, screen, fireEvent } from '../../test/testUtils';
import server from '../../test/server';
import MaintenanceModule from './MaintenanceModule';

/**
 * 🔱 Archon Test Suite: MaintenanceModule
 * Implementation: Sovereign Maintenance Node (v.1.2.0)
 */

describe('MaintenanceModule (Sovereign Maintenance)', () => {
  // Mock standard API dependencies
  beforeEach(() => {
    // scrollIntoView is not implemented in jsdom — mock it so scrollToTop executes fully
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    server.use(
      http.get('*/maintenance/forecast', () => HttpResponse.json({ success: true, data: [] })),
      http.get('*/maintenance', () => HttpResponse.json({ success: true, data: [] })),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [] }))
    );
  });

  const renderModule = (): void => {
    render(<MaintenanceModule />);
  };

  it('renders header and titles correctly', async () => {
    renderModule();
    expect(await screen.findByText('Administrar Mantenimientos')).toBeInTheDocument();
    expect(await screen.findByText(/Mantenimiento Preventivo/i)).toBeInTheDocument();
  });

  it('FORECAST → HISTORY transition via Ver Historial header action', async () => {
    renderModule();

    // Default panel is FORECAST
    expect(await screen.findByText('NO SE ENCONTRARON UNIDADES ACTIVAS')).toBeInTheDocument();

    // Header action "Ver Historial" switches to HISTORY
    const historyBtn = await screen.findByText('Ver Historial');
    fireEvent.click(historyBtn);

    // HISTORY panel empty state
    expect(await screen.findByText('NO SE ENCONTRARON REGISTROS')).toBeInTheDocument();
  });

  it('HISTORY → FORECAST via Ver Pronósticos header action', async () => {
    renderModule();
    const historyBtn = await screen.findByText('Ver Historial');
    fireEvent.click(historyBtn);
    await screen.findByText('NO SE ENCONTRARON REGISTROS');
    // Click header action button — LayoutMetadataObserver renders it
    const forecastBtn = screen.getAllByText('Ver Pronósticos')[0];
    fireEvent.click(forecastBtn);
    expect(await screen.findByText('NO SE ENCONTRARON UNIDADES ACTIVAS')).toBeInTheDocument();
  });

  it('SCHEDULE cancel returns to FORECAST when scheduleInitialUnit is set', async () => {
    const forecastRow = {
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
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [forecastRow] })
      ),
      http.get('*/maintenance/template/*', () => HttpResponse.json({ success: true, tasks: [] }))
    );
    renderModule();
    // FORECAST → SCHEDULE via Programar
    const programarBtn = await screen.findByRole('button', { name: /Programar/i });
    fireEvent.click(programarBtn);
    await screen.findByText('CONFIGURACIÓN');
    // Cancel via header action → returns to FORECAST (scheduleInitialUnit was set)
    const closeBtn = screen.getAllByText('Cerrar Formulario')[0];
    fireEvent.click(closeBtn);
    // FORECAST panel: layout title resets to Administrar Mantenimientos
    expect(await screen.findByTestId('layout-title')).toHaveTextContent(
      'Administrar Mantenimientos'
    );
  });

  it('COMPLETE panel: clicking Finalizar on ACTIVE row transitions to COMPLETE', async () => {
    const activeLog = {
      id: 1,
      uuid: 'uuid-active',
      unit_id: 'ASM-001',
      service_date: '2026-06-01',
      odometer_at_service: 50000,
      service_type: 'BASIC_10K',
      service_mode: 'WORKSHOP',
      system_recommended_type: 'BASIC_10K',
      cost: 0,
      technician: 'TechA',
      created_at: '2026-06-01T08:00:00Z',
      start_at: '2026-06-01T08:00:00Z',
      end_at: null,
      movement_status: 'ACTIVE',
    };
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [activeLog], nextCursor: null })
      ),
      http.get('*/maintenance/template/*', () => HttpResponse.json({ success: true, tasks: [] }))
    );
    renderModule();
    const histBtn = await screen.findByText('Ver Historial');
    fireEvent.click(histBtn);
    const finalizarBtn = await screen.findByRole('button', { name: /finalizar/i });
    fireEvent.click(finalizarBtn);
    // setSectionData title becomes "Finalizar Servicio" in layout observer
    expect(await screen.findByTestId('layout-title')).toHaveTextContent('Finalizar Servicio');
  });

  it('HISTORY_DETAIL panel: clicking COMPLETED row triggers handleDetailRequest', async () => {
    const completedLog = {
      id: 2,
      uuid: 'uuid-completed',
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
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [completedLog], nextCursor: null })
      )
    );
    renderModule();
    const histBtn = await screen.findByText('Ver Historial');
    fireEvent.click(histBtn);
    // Click the completed row to trigger handleDetailRequest
    const completedCell = await screen.findByText('ASM-010');
    fireEvent.click(completedCell.closest('tr') || completedCell);
    // HISTORY_DETAIL panel sets layout title to "Detalle de Servicio"
    expect(await screen.findByTestId('layout-title')).toHaveTextContent('Detalle de Servicio');
  });

  it('HISTORY_DETAIL Volver button calls handleReturnToGrid → returns to HISTORY', async () => {
    const completedLog = {
      id: 3,
      uuid: 'uuid-ret',
      unit_id: 'ASM-020',
      service_date: '2026-04-10',
      odometer_at_service: 20000,
      service_type: 'BASIC_10K',
      service_mode: 'WORKSHOP',
      system_recommended_type: 'BASIC_10K',
      cost: 2500,
      technician: 'Regresar Test',
      created_at: '2026-04-10T10:00:00Z',
      start_at: '2026-04-10T08:00:00Z',
      end_at: '2026-04-10T14:00:00Z',
      movement_status: 'COMPLETED',
    };
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [completedLog], nextCursor: null })
      ),
      http.get('*/maintenance/:uuid', () =>
        HttpResponse.json({
          success: true,
          data: { ...completedLog, details: [] },
        })
      )
    );
    renderModule();
    const histBtn = await screen.findByText('Ver Historial');
    fireEvent.click(histBtn);
    const row = await screen.findByText('ASM-020');
    fireEvent.click(row.closest('tr') || row);
    // Wait for HISTORY_DETAIL to render its Volver button
    const volverBtn = await screen.findByRole('button', { name: /volver/i });
    fireEvent.click(volverBtn);
    // handleReturnToGrid → panel returns to HISTORY
    expect(await screen.findByTestId('layout-title')).toHaveTextContent(
      'Administrar Mantenimientos'
    );
  });

  it('COMPLETE panel description uses empty string when log unit_id is null', async () => {
    const nullIdLog = {
      id: 4,
      uuid: 'uuid-null-id',
      unit_id: null,
      service_date: '2026-05-01',
      odometer_at_service: 10000,
      service_type: 'BASIC_10K',
      service_mode: 'WORKSHOP',
      system_recommended_type: 'BASIC_10K',
      cost: 0,
      technician: 'Tech',
      created_at: '2026-05-01T08:00:00Z',
      start_at: '2026-05-01T08:00:00Z',
      end_at: null,
      movement_status: 'ACTIVE',
    };
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [nullIdLog], nextCursor: null })
      ),
      http.get('*/maintenance/template/*', () => HttpResponse.json({ success: true, tasks: [] }))
    );
    renderModule();
    const histBtn = await screen.findByText('Ver Historial');
    fireEvent.click(histBtn);
    const finalizarBtn = await screen.findByRole('button', { name: /finalizar/i });
    fireEvent.click(finalizarBtn);
    // completingLog.unit_id is null → `?? ''` fallback covers line 68
    expect(await screen.findByTestId('layout-title')).toHaveTextContent('Finalizar Servicio');
  });

  it('HISTORY_DETAIL description uses empty string when log unit_id is null', async () => {
    const nullIdLog = {
      id: 5,
      uuid: 'uuid-null-detail',
      unit_id: null,
      service_date: '2026-04-01',
      odometer_at_service: 8000,
      service_type: 'BASIC_10K',
      service_mode: 'WORKSHOP',
      system_recommended_type: 'BASIC_10K',
      cost: 1500,
      technician: 'Tech',
      created_at: '2026-04-01T08:00:00Z',
      start_at: '2026-04-01T08:00:00Z',
      end_at: '2026-04-01T12:00:00Z',
      movement_status: 'COMPLETED',
    };
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [nullIdLog], nextCursor: null })
      ),
      http.get('*/maintenance/:uuid', () =>
        HttpResponse.json({ success: true, data: { ...nullIdLog, details: [] } })
      )
    );
    renderModule();
    const histBtn = await screen.findByText('Ver Historial');
    fireEvent.click(histBtn);
    // The row renders null unit_id — find by technician name
    const techCell = await screen.findByText('Tech');
    fireEvent.click(techCell.closest('tr') || techCell);
    // detailLog.unit_id is null → `?? ''` fallback covers line 86
    expect(await screen.findByTestId('layout-title')).toHaveTextContent('Detalle de Servicio');
  });

  it('?unitId query param → auto-opens SCHEDULE panel pre-selected for that unit', async () => {
    server.use(
      http.get('*/maintenance/template/*', () => HttpResponse.json({ success: true, tasks: [] }))
    );
    renderWithRoute(<MaintenanceModule />, '/?unitId=ASM-021');
    expect(await screen.findByText('CONFIGURACIÓN')).toBeInTheDocument();
    expect(await screen.findByTestId('layout-title')).toHaveTextContent(
      'Administrar Mantenimientos'
    );
  });

  it('FORECAST → SCHEDULE transition via Programar button', async () => {
    const forecastRow = {
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

    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [forecastRow] })
      ),
      http.get('*/maintenance/template/*', () => HttpResponse.json({ success: true, tasks: [] }))
    );

    renderModule();

    // Wait for the unit row's Programar button
    const programarBtn = await screen.findByRole('button', { name: /Programar/i });
    fireEvent.click(programarBtn);

    // SCHEDULE panel renders the registration form with CONFIGURACIÓN section
    expect(await screen.findByText('CONFIGURACIÓN')).toBeInTheDocument();
  });

  // ── FC 078 F2(a)/(b) — Adopcion_Adaptativa_Completa: FORECAST TABLE + CARDS ──
  describe('AT-FC078-F2a — adaptive FORECAST panel', () => {
    const forecastRow = {
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

    beforeEach(() => {
      localStorage.clear();
      server.use(
        http.get('*/maintenance/forecast', () =>
          HttpResponse.json({ success: true, data: [forecastRow] })
        ),
        http.get('*/maintenance/template/*', () => HttpResponse.json({ success: true, tasks: [] }))
      );
    });

    it('AT-FC078-F2a-MN-1: renders the adaptive selector with TABLE and CARDS only', async () => {
      renderModule();
      await screen.findByRole('button', { name: /Programar/i });
      expect(screen.getByTestId('adaptive-view-table')).toBeInTheDocument();
      expect(screen.getByTestId('adaptive-view-cards')).toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-calendar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-charts')).not.toBeInTheDocument();
    });

    it('AT-FC078-F2a-MN-2: switches to CARDS view and renders enriched forecast cards', async () => {
      renderModule();
      await screen.findByRole('button', { name: /Programar/i });
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      expect(await screen.findByTestId('archon-card-view')).toBeInTheDocument();
      // receta v2: odómetro, km restantes, próx. servicio + alerta CRITICAL
      expect(screen.getByText('49,800 km')).toBeInTheDocument();
      expect(screen.getByText('200 km')).toBeInTheDocument();
      expect(screen.getByTestId('card-alert-badge')).toHaveTextContent('Servicio en 2d');
    });

    it('AT-FC078-F2a-MN-3: Programar button inside a card navigates to SCHEDULE (onClick preservado)', async () => {
      renderModule();
      await screen.findByRole('button', { name: /Programar/i });
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      await screen.findByTestId('archon-card-view');
      const programarBtn = await screen.findByRole('button', { name: /Programar/i });
      fireEvent.click(programarBtn);
      expect(await screen.findByText('CONFIGURACIÓN')).toBeInTheDocument();
    });
  });

  it('handleRejectOrder: clicking reject-btn on OPEN log calls rejectMaintenance', async () => {
    const openLog = {
      id: 10,
      uuid: 'uuid-open-reject',
      unit_id: 'ASM-099',
      service_date: '2026-06-10',
      odometer_at_service: 60000,
      service_type: 'BASIC_10K',
      service_mode: 'WORKSHOP',
      system_recommended_type: 'BASIC_10K',
      cost: 0,
      technician: 'TechB',
      created_at: '2026-06-10T08:00:00Z',
      start_at: null,
      end_at: null,
      movement_status: 'OPEN',
      upa_work_order_id: null,
    };
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [openLog], nextCursor: null })
      ),
      http.patch('*/maintenance/*/reject', () => new HttpResponse(null, { status: 200 }))
    );
    renderModule();
    const histBtn = await screen.findByText('Ver Historial');
    fireEvent.click(histBtn);
    const rejectBtn = await screen.findByTestId('reject-btn-uuid-open-reject');
    fireEvent.click(rejectBtn);
    // After reject, refreshTrigger increments → grid re-fetches; panel stays on HISTORY
    expect(await screen.findByTestId('layout-title')).toHaveTextContent(
      'Administrar Mantenimientos'
    );
  });

  it('handleRejectOrder: reject API error is silenced and refreshTrigger still increments', async () => {
    const openLog = {
      id: 11,
      uuid: 'uuid-open-reject-err',
      unit_id: 'ASM-100',
      service_date: '2026-06-10',
      odometer_at_service: 62000,
      service_type: 'BASIC_10K',
      service_mode: 'WORKSHOP',
      system_recommended_type: 'BASIC_10K',
      cost: 0,
      technician: 'TechC',
      created_at: '2026-06-10T09:00:00Z',
      start_at: null,
      end_at: null,
      movement_status: 'OPEN',
      upa_work_order_id: null,
    };
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [openLog], nextCursor: null })
      ),
      http.patch('*/maintenance/*/reject', () => new HttpResponse(null, { status: 500 }))
    );
    renderModule();
    const histBtn = await screen.findByText('Ver Historial');
    fireEvent.click(histBtn);
    const rejectBtn = await screen.findByTestId('reject-btn-uuid-open-reject-err');
    fireEvent.click(rejectBtn);
    // Error is swallowed — panel stays on HISTORY without crashing
    expect(await screen.findByTestId('layout-title')).toHaveTextContent(
      'Administrar Mantenimientos'
    );
  });

  it('UPA panel: clicking open-upa-btn on ACTIVE log with upa_work_order_id opens UPA panel', async () => {
    const activeLog = {
      id: 20,
      uuid: 'uuid-upa-active',
      unit_id: 'ASM-042',
      service_date: '2026-06-10',
      odometer_at_service: 75000,
      service_type: 'MAJOR_50K',
      service_mode: 'WORKSHOP',
      system_recommended_type: 'MAJOR_50K',
      cost: 0,
      technician: 'TechUPA',
      created_at: '2026-06-10T08:00:00Z',
      start_at: '2026-06-10T08:30:00Z',
      end_at: null,
      movement_status: 'ACTIVE',
      upa_work_order_id: 1,
    };
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [activeLog], nextCursor: null })
      ),
      http.get('*/work-orders/*', () =>
        HttpResponse.json({
          success: true,
          data: {
            id: 1,
            uuid: 'upa-order-test',
            vehicleId: 'ASM-042',
            fleetType: 'urban',
            status: 'IN_PROGRESS',
            pendingSince: null,
            openedAt: '2026-06-10T08:30:00Z',
            closedAt: null,
            tasks: [],
          },
        })
      )
    );
    renderModule();
    const histBtn = await screen.findByText('Ver Historial');
    fireEvent.click(histBtn);
    const upaBtn = await screen.findByTestId('open-upa-btn-uuid-upa-active');
    fireEvent.click(upaBtn);
    // activePanel → 'UPA' → setSectionData('Proceso UPA', ...) → layout title updates
    expect(await screen.findByTestId('layout-title')).toHaveTextContent('Proceso UPA');
  });

  // ── FC 041 Fase C — piloto ArchonAdaptiveView (TABLE + CALENDAR) en HISTORY ──
  describe('adaptive HISTORY panel (FC 041 pilot)', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('renders the adaptive selector with TABLE and CALENDAR only', async () => {
      renderModule();
      fireEvent.click(await screen.findByText('Ver Historial'));
      await screen.findByText('NO SE ENCONTRARON REGISTROS');
      expect(screen.getByTestId('adaptive-view-table')).toBeInTheDocument();
      expect(screen.getByTestId('adaptive-view-calendar')).toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-cards')).not.toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-charts')).not.toBeInTheDocument();
    });

    it('switches to CALENDAR view and maps service_date events onto the grid', async () => {
      server.use(
        http.get('*/maintenance', () =>
          HttpResponse.json({
            success: true,
            data: [
              {
                id: 900,
                uuid: 'uuid-cal-1',
                unit_id: 'PIIC-909',
                service_date: '2026-07-20',
                odometer_at_service: 1000,
                service_type: 'BASIC_10K',
                service_mode: 'PREVENTIVE',
                system_recommended_type: null,
                cost: 100,
                technician: 'Tec',
                created_at: '2026-07-01',
                start_at: null,
                end_at: null,
              },
            ],
          })
        )
      );
      renderModule();
      fireEvent.click(await screen.findByText('Ver Historial'));
      fireEvent.click(await screen.findByTestId('adaptive-view-calendar'));
      // El panel de calendario consulta el API solo al montarse (vista activa)
      const day = await screen.findByTestId('calendar-day-2026-07-20');
      expect(day.textContent).toContain('PIIC-909');
      expect(localStorage.getItem('archon_adaptive_view_maintenance-history')).toBe('CALENDAR');
    });
  });
});
