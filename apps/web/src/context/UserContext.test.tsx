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

// FC165 F2 Slice 2.3C — exposes fullName/departments so the fallback chains
// (u.full_name || u.fullName || '', departments.length>0 ? ... : DEPARTAMENTOS)
// are directly observable.
const DetailComponent = (): React.JSX.Element => {
  const { users, departments } = useUsers();
  return (
    <div>
      <div data-testid="name-0">{users[0]?.fullName ?? '(none)'}</div>
      <div data-testid="name-1">{users[1]?.fullName ?? '(none)'}</div>
      <div data-testid="departments">{departments.join(',')}</div>
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

  // ── R4-C Fc165 F2 Slice 2.3C Batch 1 — unc lines 65,110,188 ──

  it('falls back to camelCase fullName, then to empty string, when full_name is missing', async () => {
    vi.mocked(archonCache.get).mockReturnValue([]);
    const rawUsers = [
      {
        id: 1,
        username: 'a',
        fullName: 'Camel Case Name',
        email: 'a@a.mx',
        roleId: 1,
        department: 'X',
        is_active: 1,
        roleName: 'Op',
      },
      {
        id: 2,
        username: 'b',
        email: 'b@b.mx',
        roleId: 1,
        department: 'X',
        is_active: 1,
        roleName: 'Op',
      },
    ];
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: rawUsers } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    await act(async () => {
      render(
        <UserProvider>
          <DetailComponent />
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('name-0').textContent).toBe('Camel Case Name');
      expect(screen.getByTestId('name-1').textContent).toBe('');
    });
  });

  it('uses the API-derived department catalog when it resolves non-empty', async () => {
    vi.mocked(archonCache.get).mockReturnValue([]);
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/catalogs/DEPARTMENT') {
        return Promise.resolve({
          data: { success: true, data: [{ id: 1, label: 'Logística Real' }] },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    await act(async () => {
      render(
        <UserProvider>
          <DetailComponent />
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('departments').textContent).toBe('Logística Real');
    });
  });

  it('isLoading reflects an in-flight sync with no cached users yet (usersSyncing && !users.length)', async () => {
    // archonCache.get must return a falsy value (not []) so useSilkHydration
    // treats this as a non-silent sync and flips isSyncing to true.
    vi.mocked(archonCache.get).mockReturnValue(null);
    vi.mocked(api.get).mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves within this test */
        })
    );

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('true');
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

  it('does not refresh users when the server reports success:false', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { success: false } });
    await renderActions();

    const getCallsBefore = vi.mocked(api.get).mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByText('toggle'));
    });

    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('toggled'));
    expect(vi.mocked(api.get).mock.calls.length).toBe(getCallsBefore);
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
