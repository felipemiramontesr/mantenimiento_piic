import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '../../test/testUtils';
import MaintenanceModule from './MaintenanceModule';

/**
 * 🔱 Archon Test Suite: MaintenanceModule
 * Implementation: Sovereign Maintenance Node (v.1.2.0)
 */

describe('MaintenanceModule (Sovereign Maintenance)', () => {
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

  it('transitions between History and Schedule panels', () => {
    renderModule();

    // Default should be HISTORY
    expect(
      screen.getByText('Bitácora de Servicios lista para recibir información-')
    ).toBeInTheDocument();

    // Switch to SCHEDULE
    const scheduleCard = screen.getByText('Programar Servicio');
    fireEvent.click(scheduleCard);

    expect(
      screen.getByText('Módulo de Programación listo para recibir información-')
    ).toBeInTheDocument();
  });
});
