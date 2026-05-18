import React from 'react';
import { render, waitFor, act, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserProvider, useUsers } from './UserContext';
import api from '../api/client';
import { archonCache } from '../utils/archonCache';

// 🔱 World Class Mocking
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../utils/archonCache', () => ({
  archonCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

const TestComponent = (): React.JSX.Element => {
  const { users, roles, isLoading } = useUsers();
  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="users-count">{users.length}</div>
      <div data-testid="roles-count">{roles.length}</div>
    </div>
  );
};

describe('UserContext (Silk Hydration Suite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔱 CACHE-FIRST: Should render users from cache immediately', async () => {
    const mockCacheUsers = [
      {
        id: '1',
        username: 'cached_user',
        fullName: 'Cached',
        email: '',
        roleId: 1,
        department: '',
        employeeNumber: '',
        is_active: true,
        imageUrl: '',
        roleName: 'Admin',
      },
    ];
    vi.mocked(archonCache.get).mockImplementation((key) => {
      if (key === 'users_directory') return mockCacheUsers;
      return [];
    });

    // Slow API
    vi.mocked(api.get).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { success: true, data: [] } }), 2000);
        })
    );

    await act(async () => {
      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      );
    });

    // Wait for the Silk Hydration initial sync to stabilize
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('users-count').textContent).toBe('1');
  });

  it('🔱 RESILIENCE: Should keep users on screen if API sync fails', async () => {
    const mockCacheUsers = [
      {
        id: '1',
        username: 'persistent',
        fullName: 'Persistent',
        email: '',
        roleId: 1,
        department: '',
        employeeNumber: '',
        is_active: true,
        imageUrl: '',
        roleName: 'Admin',
      },
    ];
    vi.mocked(archonCache.get).mockImplementation((key) => {
      if (key === 'users_directory') return mockCacheUsers;
      return [];
    });
    vi.mocked(api.get).mockRejectedValue(new Error('Network Failure'));

    await act(async () => {
      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/auth/users');
    });

    // Still shows cached data
    expect(screen.getByTestId('users-count').textContent).toBe('1');
  });

  it('🔱 TYPE SHIELDING: Should map raw response to industrial schema', async () => {
    vi.mocked(archonCache.get).mockReturnValue([]);
    const rawUsers = [
      {
        id: 101,
        username: 'jdoe',
        full_name: 'John Doe',
        email: 'j@d.com',
        roleId: 2,
        department: 'Logistics',
        is_active: 1,
        roleName: 'Operator',
      },
    ];
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: rawUsers } });
      if (url === '/catalogs/DEPARTMENT')
        return Promise.resolve({ data: { success: true, data: [] } });
      if (url === '/auth/roles') return Promise.resolve({ data: { success: true, data: [] } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    await act(async () => {
      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('users-count').textContent).toBe('1');
    });
  });
});
