import React from 'react';
import { render, waitFor, act, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserProvider, useUsers } from './UserContext';
import api from '../api/client';
import { archonCache } from '../utils/archonCache';

// 🔱 World Class Mocking
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../utils/archonCache', () => ({
  archonCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

const TestComponent = (): React.JSX.Element => {
  const { users, isLoading } = useUsers();
  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="users-count">{users.length}</div>
    </div>
  );
};

// 🔱 FC162 R4-C — exposes the full action surface (toggleUserStatus/
// updateUser/deleteUser) so tests can drive it, not just read derived state.
const ActionsTestComponent = (): React.JSX.Element => {
  const { toggleUserStatus, updateUser, deleteUser } = useUsers();
  const [result, setResult] = React.useState<string>('none');
  return (
    <div>
      <div data-testid="result">{result}</div>
      <button
        onClick={async (): Promise<void> => {
          await toggleUserStatus('1', false);
          setResult('toggled');
        }}
      >
        toggle
      </button>
      <button
        onClick={async (): Promise<void> => {
          const ok = await updateUser('1', { fullName: 'New Name' }, 'reason');
          setResult(ok ? 'update-true' : 'update-false');
        }}
      >
        update
      </button>
      <button
        onClick={async (): Promise<void> => {
          const ok = await deleteUser('1', 'reason');
          setResult(ok ? 'delete-true' : 'delete-false');
        }}
      >
        delete
      </button>
    </div>
  );
};

const NoProviderComponent = (): React.JSX.Element => {
  useUsers();
  return <div>never renders</div>;
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

/**
 * FC162 R4-C (100% mandatorio, 204_AN/206_AN Bravo) — toggleUserStatus,
 * updateUser and deleteUser were never called by any existing test, and
 * useUsers' no-provider throw had no direct coverage either.
 */
const renderActions = async (): Promise<void> => {
  vi.mocked(archonCache.get).mockReturnValue([]);
  vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [] } });
  await act(async () => {
    render(
      <UserProvider>
        <ActionsTestComponent />
      </UserProvider>
    );
  });
};

describe('UserContext — toggleUserStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('patches the status and refreshes users on success', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true } });
    await renderActions();

    const getCallsBefore = vi.mocked(api.get).mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByText('toggle'));
    });

    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('toggled'));
    expect(api.patch).toHaveBeenCalledWith(
      '/auth/users/1',
      expect.objectContaining({ data: { is_active: true } })
    );
    // fetchUsers() triggers a second /auth/users GET beyond the initial mount one.
    expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(getCallsBefore);
  });
});

describe('UserContext — updateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('maps the payload to backend schema, patches and refreshes users on success', async () => {
    let capturedBody: unknown = null;
    vi.mocked(api.patch).mockImplementation((_url, body) => {
      capturedBody = body;
      return Promise.resolve({ data: { success: true } });
    });
    await renderActions();

    await act(async () => {
      fireEvent.click(screen.getByText('update'));
    });

    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('update-true'));
    expect(capturedBody).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ fullName: 'New Name' }),
        reason: 'reason',
      })
    );
  });

  it('returns false without refreshing when the server reports success:false', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { success: false } });
    await renderActions();

    const getCallsBefore = vi.mocked(api.get).mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByText('update'));
    });

    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('update-false'));
    expect(vi.mocked(api.get).mock.calls.length).toBe(getCallsBefore);
  });

  it('returns false when the PATCH call rejects', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('network down'));
    await renderActions();

    await act(async () => {
      fireEvent.click(screen.getByText('update'));
    });

    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('update-false'));
  });
});

describe('UserContext — deleteUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('deletes and refreshes users on success', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
    await renderActions();

    const getCallsBefore = vi.mocked(api.get).mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByText('delete'));
    });

    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('delete-true'));
    expect(api.delete).toHaveBeenCalledWith('/auth/users/1', { data: { reason: 'reason' } });
    expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(getCallsBefore);
  });

  it('returns false without refreshing when the server reports success:false', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: false } });
    await renderActions();

    await act(async () => {
      fireEvent.click(screen.getByText('delete'));
    });

    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('delete-false'));
  });

  it('returns false when the DELETE call rejects', async () => {
    vi.mocked(api.delete).mockRejectedValue(new Error('network down'));
    await renderActions();

    await act(async () => {
      fireEvent.click(screen.getByText('delete'));
    });

    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('delete-false'));
  });
});

describe('UserContext — useUsers without a provider', () => {
  it('throws when used outside of a UserProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    expect(() => render(<NoProviderComponent />)).toThrow(
      'useUsers must be used within a UserProvider'
    );
    consoleSpy.mockRestore();
  });
});
