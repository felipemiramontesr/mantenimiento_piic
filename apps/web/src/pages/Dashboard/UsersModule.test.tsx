import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, RenderResult } from '../../test/testUtils';
import UsersModule from './UsersModule';

/**
 * 🔱 Archon Test Suite: UsersModule (v.28.25.2)
 * Implementation: Identity Sync Certification
 */
describe('UsersModule Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModule = (): RenderResult => render(<UsersModule />);

  it('should render the correct administrative context', async (): Promise<void> => {
    renderModule();
    // Updated to match Fleet-Standard label (v.28.24.0)
    expect(await screen.findByText(/Administrar Personal/i)).toBeInTheDocument();
  });

  it('should display the core personnel instruments', async (): Promise<void> => {
    renderModule();
    // Updated to match Archon Standard labels (v.28.24.0)
    expect(screen.getByText(/EMPLEADO/i)).toBeInTheDocument();
    expect(screen.getByText(/Alta de Personal/i)).toBeInTheDocument();
  });
});
