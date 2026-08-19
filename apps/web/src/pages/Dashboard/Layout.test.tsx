import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
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

vi.mock('../../hooks/usePermissions', () => ({
  default: (): MockPermissions => ({
    hasPermission: () => true,
    hasAnyPermission: () => true,
    isOmnipotent: () => true,
    isOmegaStrict: () => true,
  }),
}));

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
});
