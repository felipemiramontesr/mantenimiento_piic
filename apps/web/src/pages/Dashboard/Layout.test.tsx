import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import DashboardLayout from './Layout';

/**
 * FC162 R4-A (100% mandatorio, 202_AN Bravo) — minimal composition smoke:
 * mocks FleetProvider/auth/permissions/alerts (real fetch/session-restore
 * side effects), same pattern Sidebar.test.tsx already uses for its own
 * children. Verifies the sovereign grid shell (Sidebar/Header/Subheader/
 * Footer/PanicButton) mounts and the routed Outlet content renders.
 */

vi.mock('../../context/FleetContext', () => ({
  FleetProvider: ({ children }: { children: ReactNode }): ReactNode => children,
}));

interface MockAuth {
  currentUser: { username: string; imageUrl: string | null };
  logout: () => void;
}

interface MockPermissions {
  hasPermission: () => boolean;
  hasAnyPermission: () => boolean;
  isOmnipotent: () => boolean;
  isOmegaStrict: () => boolean;
  isItinerantArc: () => boolean;
}

interface MockAlertsCount {
  count: number;
  isLoading: boolean;
}

vi.mock('../../context/AuthContext', () => ({
  useAuth: (): MockAuth => ({
    currentUser: { username: 'Soberano', imageUrl: null },
    logout: vi.fn(),
  }),
}));

const usePermissionsMock = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/usePermissions', () => ({
  default: usePermissionsMock,
}));

const defaultPermissions: MockPermissions = {
  hasPermission: () => true,
  hasAnyPermission: () => true,
  isOmnipotent: () => true,
  isOmegaStrict: () => true,
  isItinerantArc: () => false,
};

vi.mock('../../hooks/useAlertsCount', () => ({
  default: (): MockAlertsCount => ({ count: 0, isLoading: false }),
}));

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    defaults: { baseURL: 'https://apiv1.piic.com.mx/v1' },
  },
}));

describe('DashboardLayout (composition smoke)', () => {
  beforeEach(() => {
    usePermissionsMock.mockReturnValue(defaultPermissions);
  });

  it('mounts the sovereign grid shell and renders the routed Outlet content', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<div data-testid="outlet-child">Módulo activo</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('outlet-child')).toBeInTheDocument();
    expect(screen.getByText('Soberano')).toBeInTheDocument();
  });

  it('toggles the sidebar collapsed state when the collapse trigger is clicked', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<div data-testid="outlet-child">Módulo activo</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const collapseTrigger = container
      .querySelector('svg.lucide-chevron-right')
      ?.closest('button') as HTMLElement;
    expect(collapseTrigger).toBeTruthy();

    fireEvent.click(collapseTrigger);

    expect(container.querySelector('svg.lucide-chevron-left')).toBeTruthy();
  });

  describe('FC182 F2 — itinerant Arc redirect (Cond.R-182 R1, client-side UX belt on top of the server-side 403 boundary)', () => {
    beforeEach(() => {
      usePermissionsMock.mockReturnValue({ ...defaultPermissions, isItinerantArc: () => true });
    });

    it('redirects away from a disallowed path (e.g. the dashboard index) to /dashboard/social', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<div data-testid="outlet-child">Módulo activo</div>} />
              <Route path="social" element={<div data-testid="arcsial-page">Arcsial</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('outlet-child')).not.toBeInTheDocument();
      expect(screen.getByTestId('arcsial-page')).toBeInTheDocument();
    });

    it('does not redirect when already on /dashboard/social', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/social']}>
          <Routes>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<div data-testid="outlet-child">Módulo activo</div>} />
              <Route path="social" element={<div data-testid="arcsial-page">Arcsial</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('arcsial-page')).toBeInTheDocument();
    });

    it('shows the sovereign itinerant banner', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/social']}>
          <Routes>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route path="social" element={<div data-testid="arcsial-page">Arcsial</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(/Arconauta Itinerante/i)).toBeInTheDocument();
    });
  });

  it('does not show the itinerant banner for a non-itinerant user', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<div data-testid="outlet-child">Módulo activo</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText(/Arconauta Itinerante/i)).not.toBeInTheDocument();
  });
});
