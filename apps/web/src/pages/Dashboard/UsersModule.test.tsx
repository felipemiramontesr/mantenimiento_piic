import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, RenderResult } from '../../test/testUtils';
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

  // ── FC 074 F3 — Primera Oleada Adaptativa: ArchonAdaptiveView (TABLE + CARDS) en DIRECTORY ──
  describe('AT-FC074-F3 — adaptive DIRECTORY panel', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('AT-FC074-F3-US-1: renders the adaptive selector with TABLE and CARDS only', async () => {
      renderModule();
      await screen.findByText(/Administrar Personal/i);
      expect(screen.getByTestId('adaptive-view-table')).toBeInTheDocument();
      expect(screen.getByTestId('adaptive-view-cards')).toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-calendar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-charts')).not.toBeInTheDocument();
    });

    it('AT-FC074-F3-US-2: switches to CARDS view and renders personnel as cards', async () => {
      renderModule();
      await screen.findByText(/Administrar Personal/i);
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      expect(await screen.findByTestId('archon-card-view')).toBeInTheDocument();
      expect(screen.getAllByTestId('archon-card-item').length).toBeGreaterThan(0);
      expect(localStorage.getItem('archon_adaptive_view_users-directory')).toBe('CARDS');
    });

    // FC 078 F2(b) — receta v2: depto/no. empleado/correo como métricas nuevas
    it('AT-FC078-F2b-US-1: card shows department, employee number and email metric rows', async () => {
      renderModule();
      await screen.findByText(/Administrar Personal/i);
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      await screen.findByTestId('archon-card-view');
      expect(screen.getByText('Operaciones')).toBeInTheDocument();
      expect(screen.getByText('EMP-001')).toBeInTheDocument();
      expect(screen.getByText('juan.perez@piic.com.mx')).toBeInTheDocument();
    });
  });
});
