import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '../../test/testUtils';
import AdminModule from './AdminModule';

import usePermissions from '../../hooks/usePermissions';

vi.mock('../../components/Admin/RolePermissionsMatrix', () => ({
  default: (): React.JSX.Element => <div data-testid="permissions-matrix">Permissions Matrix</div>,
}));

vi.mock('../../components/Admin/RolesManager', () => ({
  default: (): React.JSX.Element => <div data-testid="roles-manager">Roles Manager</div>,
}));

vi.mock('../../hooks/usePermissions', () => ({
  default: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (): Promise<unknown> => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('AdminModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both cards when user has system:manage_roles', async () => {
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: (p: string) => p === 'system:manage_roles',
      hasAnyPermission: () => true,
      isOmnipotent: () => true,
    });
    render(<AdminModule />);
    await waitFor(() => expect(screen.getByTestId('permissions-matrix')).toBeInTheDocument());
    expect(screen.getByTestId('roles-manager')).toBeInTheDocument();
  });

  it('redirects when user lacks system:manage_roles', async () => {
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: () => false,
      hasAnyPermission: () => false,
      isOmnipotent: () => false,
    });
    render(<AdminModule />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
    expect(screen.queryByTestId('permissions-matrix')).toBeNull();
    expect(screen.queryByTestId('roles-manager')).toBeNull();
  });

  it('sets section title to Panel de Control', async () => {
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: (p: string) => p === 'system:manage_roles',
      hasAnyPermission: () => true,
      isOmnipotent: () => true,
    });
    render(<AdminModule />);
    await waitFor(() =>
      expect(screen.getByTestId('layout-title')).toHaveTextContent('Panel de Control')
    );
  });

  it('renders Card 1 heading Gestión de Roles', async () => {
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: (p: string) => p === 'system:manage_roles',
      hasAnyPermission: () => true,
      isOmnipotent: () => true,
    });
    render(<AdminModule />);
    await waitFor(() => expect(screen.getByText(/Gestión de Roles/i)).toBeInTheDocument());
  });

  it('renders Card 2 heading Matriz de Permisos', async () => {
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: (p: string) => p === 'system:manage_roles',
      hasAnyPermission: () => true,
      isOmnipotent: () => true,
    });
    render(<AdminModule />);
    await waitFor(() => expect(screen.getByText(/Matriz de Permisos/i)).toBeInTheDocument());
  });
});
