import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
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

  it('renders header and titles correctly', () => {
    renderModule();
    expect(screen.getByText('Administrar Mantenimientos')).toBeInTheDocument();
    expect(screen.getByText(/Mantenimiento Preventivo/i)).toBeInTheDocument();
  });

  it('transitions between History and Schedule panels', () => {
    renderModule();

    // Default should be HISTORY
    expect(
      screen.getByText('Bitácora de Servicios lista para recibir información-')
    ).toBeInTheDocument();

    // Switch to SCHEDULE
    const scheduleCard = screen.getByText('Gestión de Servicios');
    fireEvent.click(scheduleCard);

    expect(
      screen.getByText('Módulo de Programación listo para recibir información-')
    ).toBeInTheDocument();
  });

  it('toggles user menu', () => {
    renderModule();
    const menuButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(menuButton);
    expect(screen.getByText('Ajustes')).toBeInTheDocument();
    expect(screen.getByText('Desconexión')).toBeInTheDocument();
  });
});
