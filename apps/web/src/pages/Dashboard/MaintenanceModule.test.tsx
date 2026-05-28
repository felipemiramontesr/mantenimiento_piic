import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { render, screen, fireEvent } from '../../test/testUtils';
import server from '../../test/server';
import MaintenanceModule from './MaintenanceModule';

/**
 * 🔱 Archon Test Suite: MaintenanceModule
 * Implementation: Sovereign Maintenance Node (v.1.2.0)
 */

describe('MaintenanceModule (Sovereign Maintenance)', () => {
  // Mock standard API dependencies
  beforeEach(() => {
    server.use(
      http.get('*/maintenance/forecast', () => HttpResponse.json({ success: true, data: [] })),
      http.get('*/maintenance', () => HttpResponse.json({ success: true, data: [] })),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [] }))
    );
  });

  const renderModule = (): void => {
    render(
      <MemoryRouter>
        <MaintenanceModule />
      </MemoryRouter>
    );
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
});
