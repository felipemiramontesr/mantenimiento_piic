import React from 'react';
import { render, waitFor, act, RenderResult } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { UserProvider, useUsers } from './UserContext';
import api from '../api/client';

// 🔱 Mock API Client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const TestComponent = (): React.JSX.Element => {
  const { users, roles, isLoading, fetchUsers } = useUsers();
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'true' : 'false'}</div>
      <div data-testid="users-count">{users.length}</div>
      <div data-testid="roles-count">{roles.length}</div>
      <button
        onClick={(): void => {
          fetchUsers().catch(() => {
            /* ignore */
          });
        }}
      >
        Refresh
      </button>
    </div>
  );
};

const TestComponentWithActions = (): React.JSX.Element => {
  const { toggleUserStatus, updateUser } = useUsers();
  return (
    <div>
      <button
        onClick={(): void => {
          toggleUserStatus('1', true).catch(() => {
            /* ignore */
          });
        }}
      >
        Toggle
      </button>
      <button
        onClick={(): void => {
          updateUser('1', { fullName: 'New Name' }).catch(() => {
            /* ignore */
          });
        }}
      >
        Update
      </button>
    </div>
  );
};

describe('UserContext (Identity Infrastructure)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates users and roles from API', async () => {
    (api.get as Mock).mockImplementation((url: string) => {
      if (url === '/auth/users')
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: 1,
                full_name: 'Test User',
                email: 't@t.com',
                roleId: 1,
                department: 'TI',
                is_active: 1,
                roleName: 'Admin',
              },
            ],
          },
        });
      if (url === '/auth/roles')
        return Promise.resolve({ data: { success: true, data: [{ id: 1, label: 'Admin' }] } });
      if (url === '/catalogs/DEPARTMENT')
        return Promise.resolve({ data: [{ id: 1, label: 'TI' }] });
      return Promise.reject(new Error('Unknown URL'));
    });

    let renderResult: RenderResult | undefined;
    await act(async () => {
      renderResult = render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      );
    });

    const { getByTestId } = renderResult!;
    await waitFor(() => expect(getByTestId('users-count').textContent).toBe('1'));
    expect(getByTestId('roles-count').textContent).toBe('1');
  });

  it('handles fetchUsers correctly', async () => {
    (api.get as Mock).mockResolvedValue({ data: { success: true, data: [] } });

    let renderResult: RenderResult | undefined;
    await act(async () => {
      renderResult = render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      );
    });

    const { getByText } = renderResult!;

    await act(async () => {
      getByText('Refresh').click();
    });

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/auth/users'));
  });

  it('handles toggleUserStatus correctly', async () => {
    (api.get as Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (api.patch as Mock).mockResolvedValue({ data: { success: true } });

    let renderResult: RenderResult | undefined;
    await act(async () => {
      renderResult = render(
        <UserProvider>
          <TestComponentWithActions />
        </UserProvider>
      );
    });

    await act(async () => {
      renderResult!.getByText('Toggle').click();
    });

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/auth/users/1', { is_active: false })
    );
  });

  it('handles updateUser correctly', async () => {
    (api.get as Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (api.patch as Mock).mockResolvedValue({ data: { success: true } });

    let renderResult: RenderResult | undefined;
    await act(async () => {
      renderResult = render(
        <UserProvider>
          <TestComponentWithActions />
        </UserProvider>
      );
    });

    await act(async () => {
      renderResult!.getByText('Update').click();
    });

    await waitFor(() => expect(api.patch).toHaveBeenCalled());
  });

  it('handles updateUser failure correctly', async () => {
    (api.get as Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (api.patch as Mock).mockResolvedValue({ data: { success: false } });

    let renderResult: RenderResult | undefined;
    await act(async () => {
      renderResult = render(
        <UserProvider>
          <TestComponentWithActions />
        </UserProvider>
      );
    });

    await act(async () => {
      renderResult!.getByText('Update').click();
    });

    await waitFor(() => expect(api.patch).toHaveBeenCalled());
  });

  it('throws error when useUsers is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation((): void => {
      /* ignore */
    });
    expect(() => render(<TestComponent />)).toThrow('useUsers must be used within a UserProvider');
    consoleSpy.mockRestore();
  });
});
