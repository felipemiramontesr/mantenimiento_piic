import { render, screen, fireEvent, waitFor, RenderResult } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import FleetModule from './FleetModule';
import { FleetProvider } from '../../context/FleetContext';

/**
 * 🔱 Archon Test Suite: FleetModule (Orchestrator)
 * Implementation: 100% Path Coverage (Pillar 2 - v.17.0.0)
 */

// Mock specialized context
vi.mock('../../context/FleetContext', async () => {
  const actual = await vi.importActual('../../context/FleetContext');
  return {
    ...actual,
    useFleet: (): Record<string, unknown> => ({
      refreshUnits: vi.fn(async (): Promise<void> => {
        /* No-op */
      }),
    }),
  };
});

describe('FleetModule Orchestrator', () => {
  const renderModule = (): RenderResult =>
    render(
      <MemoryRouter>
        <FleetProvider>
          <FleetModule />
        </FleetProvider>
      </MemoryRouter>
    );

  it('should start in the GRID view', (): void => {
    renderModule();
    expect(screen.getByText('Administrar Unidades')).toBeInTheDocument();
  });

  it('should transition to CREATE view when starting registration', (): void => {
    renderModule();
    fireEvent.click(screen.getByText(/Registrar/i));
    expect(screen.getByText('Identidad del Activo')).toBeInTheDocument();
    expect(screen.getByText('Volver al Panel')).toBeInTheDocument();
  });

  it('should return to GRID view when clicking "Volver al Panel"', (): void => {
    renderModule();
    fireEvent.click(screen.getByText(/Registrar/i));
    fireEvent.click(screen.getByText('Volver al Panel'));
    expect(screen.getByText('Administrar Unidades')).toBeInTheDocument();
  });

  it('should show success view after successful registration', async (): Promise<void> => {
    renderModule();
    fireEvent.click(screen.getByText(/Registrar/i));

    // Simulate successful submission in the child form
    fireEvent.click(screen.getByText(/Confirmar Registro/i));

    await waitFor((): void => {
      expect(screen.getByText('Unidad Registrada con Éxito')).toBeInTheDocument();
    });
  });

  it('should toggle user menu correctly', (): void => {
    renderModule();
    const menuButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(menuButton);
    expect(screen.getByText('Ajustes')).toBeInTheDocument();
    expect(screen.getByText('Desconexión')).toBeInTheDocument();
  });

  it('should logout correctly', (): void => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    renderModule();
    fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
    fireEvent.click(screen.getByText('Desconexión'));
    expect(removeItemSpy).toHaveBeenCalledWith('archon_token');
  });
});
