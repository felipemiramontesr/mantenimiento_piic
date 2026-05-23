import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '../../test/testUtils';
import { http, HttpResponse } from 'msw';
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
      http.get('*/maintenance', () => {
        return HttpResponse.json({
          success: true,
          data: []
        });
      }),
      http.get('*/fleet', () => {
        return HttpResponse.json({
          success: true,
          data: []
        });
      })
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

  it('transitions between History and Schedule panels', async () => {
    renderModule();

    // Default should be HISTORY
    expect(
      await screen.findByText('Historial de Servicios')
    ).toBeInTheDocument();

    // Switch to SCHEDULE
    const scheduleCard = await screen.findByText('Programar Servicio');
    fireEvent.click(scheduleCard);

    expect(
      await screen.findByText('CONFIGURACIÓN')
    ).toBeInTheDocument();
  });
});
