import { render, screen, RenderResult } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UsersModule from './UsersModule';

import { UserProvider } from '../../context/UserContext';

/**
 * 🔱 Archon Test Suite: UsersModule (v.28.25.2)
 * Implementation: Identity Sync Certification
 */
describe('UsersModule Component', () => {
  const renderModule = (): RenderResult =>
    render(
      <MemoryRouter>
        <UserProvider>
          <UsersModule />
        </UserProvider>
      </MemoryRouter>
    );

  it('should render the correct administrative context', (): void => {
    renderModule();
    // Updated to match Fleet-Standard label (v.28.24.0)
    expect(screen.getByText(/Administrar Personal/i)).toBeInTheDocument();
  });

  it('should display the core personnel instruments', (): void => {
    renderModule();
    // Updated to match Archon Standard labels (v.28.24.0)
    expect(screen.getByText(/Directorio Maestro/i)).toBeInTheDocument();
    expect(screen.getByText(/Alta de Personal/i)).toBeInTheDocument();
  });
});
