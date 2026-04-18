import { render, screen, RenderResult } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UsersModule from './UsersModule';

/**
 * 🔱 Archon Test Suite: UsersModule (v.18.7.0.1)
 * Implementation: PIIC Personnel Layout Certification
 */
describe('UsersModule Component', () => {
  const renderModule = (): RenderResult =>
    render(
      <MemoryRouter>
        <UsersModule />
      </MemoryRouter>
    );

  it('should render the correct administrative context', (): void => {
    renderModule();
    expect(screen.getByText(/Administrar personal/i)).toBeInTheDocument();
  });

  it('should display the core personnel instruments', (): void => {
    renderModule();
    expect(screen.getAllByText(/Mando y Supervisión/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Agregar Personal/i)).toBeInTheDocument();
  });

  it('should display the migrated "Despliegue Operativo" instrument', (): void => {
    renderModule();
    expect(screen.getByText(/Despliegue Operativo/i)).toBeInTheDocument();
    expect(screen.getByText(/Asignación/i)).toBeInTheDocument();
  });
});
