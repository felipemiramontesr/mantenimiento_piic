import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '../../test/testUtils';
import AdminModule from './AdminModule';

import usePermissions from '../../hooks/usePermissions';

// Mock the permissions matrix to avoid complex admin UI in unit tests
vi.mock('../../components/Admin/RolePermissionsMatrix', () => ({
  default: (): React.JSX.Element => <div data-testid="permissions-matrix">Permissions Matrix</div>,
}));

// Mock usePermissions to control omnipotent check
vi.mock('../../hooks/usePermissions', () => ({
  default: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (): Promise<unknown> => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('AdminModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the permissions matrix when user is omnipotent', async () => {
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: () => true,
      hasAnyPermission: () => true,
      isOmnipotent: () => true,
    });
    render(<AdminModule />);
    await waitFor(() => expect(screen.getByTestId('permissions-matrix')).toBeInTheDocument());
    expect(screen.getAllByText(/Roles y Permisos/i).length).toBeGreaterThan(0);
  });

  it('renders empty fragment and redirects when user is not omnipotent', async () => {
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: () => false,
      hasAnyPermission: () => false,
      isOmnipotent: () => false,
    });
    render(<AdminModule />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
    expect(screen.queryByTestId('permissions-matrix')).toBeNull();
  });

  it('sets correct layout section data when omnipotent', async () => {
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: () => true,
      hasAnyPermission: () => true,
      isOmnipotent: () => true,
    });
    render(<AdminModule />);
    await waitFor(() =>
      expect(screen.getByTestId('layout-title')).toHaveTextContent('Administración')
    );
  });
});
