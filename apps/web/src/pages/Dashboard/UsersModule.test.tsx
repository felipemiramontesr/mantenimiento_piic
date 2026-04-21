import { render, screen, RenderResult } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UsersModule from './UsersModule';

/**
 * 🔱 Archon Test Suite: UsersModule (v.28.23.3)
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
    // Updated to match Archon Standard label (v.28.23.0)
    expect(screen.getByText(/Administración de Personal/i)).toBeInTheDocument();
  });

  it('should display the core personnel instruments', (): void => {
    renderModule();
    // Updated to match Archon Standard labels (v.28.23.0)
    expect(screen.getAllByText(/Mando y Supervisión/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Incorporación de Personal/i)).toBeInTheDocument();
  });
});
