import React from 'react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { screen, fireEvent, cleanup, within, act, render } from '../../test/testUtils';
import api from '../../api/client';
import UserRegistrationForm from './UserRegistrationForm';

/**
 * 🔱 Archon Test: Owners Assignment in UserRegistrationForm (F1-A · A4)
 * Updated V.230: OWNER_SCOPED_ROLE_IDS = [1, 3, 4] per Archon Master bands.
 * 1 = Propietario de Flotilla · 3 = Centro Especializado · 4 = Propietario Privado
 */

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ data: { success: true, userId: 55 } }),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

interface MockUserState {
  users: unknown[];
  isLoading: boolean;
  activePanel: string;
  setActivePanel: Mock;
  fetchUsers: Mock;
  toggleUserStatus: Mock;
  updateUser: Mock;
  deleteUser: Mock;
  editingUser: Record<string, unknown> | null;
  setEditingUser: Mock;
  departments: string[];
  roles: { id: number; label: string }[];
}

const getMockState = (): MockUserState => ({
  users: [],
  isLoading: false,
  activePanel: 'SIGNUP',
  setActivePanel: vi.fn(),
  fetchUsers: vi.fn().mockResolvedValue(true),
  toggleUserStatus: vi.fn(),
  updateUser: vi.fn().mockResolvedValue(true),
  deleteUser: vi.fn().mockResolvedValue(true),
  editingUser: null,
  setEditingUser: vi.fn(),
  departments: ['IT'],
  // id 7 = internal staff (not in Archon Master bands 0-5); id 1 = Flotilla (owner-scoped)
  roles: [
    { id: 7, label: 'Operador General' },
    { id: 1, label: 'Propietario de Flotilla' },
    { id: 4, label: 'Propietario Privado' },
  ],
});

let currentMockState = getMockState();

vi.mock('../../context/UserContext', () => ({
  useUsers: (): MockUserState => currentMockState,
  UserProvider: ({ children }: { children: React.ReactNode }): React.ReactElement => (
    <div>{children}</div>
  ),
  UserContext: {
    Provider: ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <div>{children}</div>
    ),
  },
}));

const mockCatalog = [
  { id: 711, label: 'Arian Silver de México' },
  { id: 712, label: 'Huur' },
];

const routeApiGet = (linkedOwners: { ownerId: number; label: string }[]): void => {
  (api.get as Mock).mockImplementation((url: string) => {
    if (url.includes('/catalogs/FLEET_OWNER')) {
      return Promise.resolve({ data: { success: true, data: mockCatalog } });
    }
    if (url.includes('/owners')) {
      return Promise.resolve({ data: { success: true, data: linkedOwners } });
    }
    return Promise.resolve({ data: { success: true, data: [] } });
  });
};

describe('UserRegistrationForm — Propietarios Asignados (Owner-Scoped)', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    currentMockState = getMockState();
    routeApiGet([]);
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, userId: 55 } });
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } });
  });

  it('does not render the owners section for non-scoped roles', () => {
    // default roleId resolves to 'Operador General' (id 7) → isInternalStaff → no owners section
    render(<UserRegistrationForm />);
    expect(screen.queryByTestId('owners-assignment')).not.toBeInTheDocument();
    expect(api.get as Mock).not.toHaveBeenCalledWith(expect.stringContaining('FLEET_OWNER'));
  });

  it('renders the owners section with catalog chips when editing a Flotilla owner (role 1)', async () => {
    currentMockState.editingUser = {
      id: 10,
      username: 'juan.perez',
      fullName: 'Juan Pérez',
      email: 'juan@cliente.mx',
      roleId: 1,
      department: '',
      employeeNumber: '',
      imageUrl: '',
    };
    routeApiGet([{ ownerId: 711, label: 'Arian Silver de México' }]);

    render(<UserRegistrationForm />);

    expect(await screen.findByTestId('owners-assignment')).toBeInTheDocument();
    expect(await screen.findByTestId('owner-chip-711')).toBeInTheDocument();
    expect(screen.getByTestId('owner-chip-712')).toBeInTheDocument();
    // linked owner arrives pre-selected
    expect(screen.getByTestId('owner-chip-711')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('owner-chip-712')).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not render owners-assignment for role 4 (Propietario Privado) — uses centro section instead', async () => {
    currentMockState.editingUser = {
      id: 11,
      username: 'privado',
      fullName: 'Privado Uno',
      email: 'privado@piic.com.mx',
      roleId: 4,
      department: '',
      employeeNumber: '',
      imageUrl: '',
    };

    render(<UserRegistrationForm />);
    // Rol 4 removed from OWNER_SCOPED_ROLE_IDS — owner chips no longer shown
    expect(screen.queryByTestId('owners-assignment')).not.toBeInTheDocument();
    // Centro section only shown for new users (!editingUser)
    expect(screen.queryByTestId('privado-centro-section')).not.toBeInTheDocument();
  });

  it('persists the new owner set via PUT on edit save (with audit reason)', async () => {
    currentMockState.editingUser = {
      id: 10,
      username: 'juan.perez',
      fullName: 'Juan Pérez',
      email: 'juan@cliente.mx',
      roleId: 1,
      department: '',
      employeeNumber: '',
      imageUrl: '',
    };
    routeApiGet([{ ownerId: 711, label: 'Arian Silver de México' }]);

    render(<UserRegistrationForm />);

    const chipHuur = await screen.findByTestId('owner-chip-712');
    fireEvent.click(chipHuur); // select Huur → set becomes [711, 712]

    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });

    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByPlaceholderText(/error en kilometraje/i), {
      target: { value: 'Asignación de propietarios de prueba' },
    });
    await act(async () => {
      fireEvent.click(within(modal).getByText('Sincronizar'));
    });

    expect(currentMockState.updateUser).toHaveBeenCalled();
    expect(api.put as Mock).toHaveBeenCalledWith('/auth/users/10/owners', {
      ownerIds: [711, 712],
      reason: 'Asignación de propietarios de prueba',
    });
  });

  it('deselecting a chip removes it from the persisted set', async () => {
    currentMockState.editingUser = {
      id: 10,
      username: 'juan.perez',
      fullName: 'Juan Pérez',
      email: 'juan@cliente.mx',
      roleId: 1,
      department: '',
      employeeNumber: '',
      imageUrl: '',
    };
    routeApiGet([{ ownerId: 711, label: 'Arian Silver de México' }]);

    render(<UserRegistrationForm />);

    const chipAS = await screen.findByTestId('owner-chip-711');
    fireEvent.click(chipAS); // deselect → []

    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByPlaceholderText(/error en kilometraje/i), {
      target: { value: 'Revocación de propietarios' },
    });
    await act(async () => {
      fireEvent.click(within(modal).getByText('Sincronizar'));
    });

    expect(api.put as Mock).toHaveBeenCalledWith('/auth/users/10/owners', {
      ownerIds: [],
      reason: 'Revocación de propietarios',
    });
  });

  it('on create with a Flotilla owner role, links the selected owners after register', async () => {
    // Force default role resolution to Flotilla owner (label includes "operador")
    currentMockState.roles = [{ id: 1, label: 'Operador Flotilla' }];

    render(<UserRegistrationForm />);

    const chipAS = await screen.findByTestId('owner-chip-711');
    fireEvent.click(chipAS);

    fireEvent.change(screen.getByPlaceholderText(/Ej\. Ana Karen Flores Baca/i), {
      target: { value: 'Juan Pérez' },
    });
    fireEvent.change(screen.getByPlaceholderText(/aflores/i), {
      target: { value: 'juan.perez' },
    });
    fireEvent.change(screen.getByPlaceholderText(/ana.karen@piic.com.mx/i), {
      target: { value: 'juan@cliente.mx' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });

    expect(api.post as Mock).toHaveBeenCalledWith('/auth/register', expect.any(Object));
    expect(api.put as Mock).toHaveBeenCalledWith('/auth/users/55/owners', {
      ownerIds: [711],
      reason: 'Alta de usuario con propietarios asignados',
    });
  });
});
