import React from 'react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { screen, fireEvent, waitFor, cleanup, within, act, render } from '../../test/testUtils';
import api from '../../api/client';
import UserRegistrationForm from './UserRegistrationForm';

// 🔱 Mock API Client
vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    post: vi.fn().mockResolvedValue({ data: { success: true, userId: '123' } }),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

// 🔱 Context Mocking Factory
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
  departments: ['IT', 'Sistemas'],
  roles: [
    { id: 1, label: 'Admin' },
    { id: 2, label: 'Operador' },
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

describe('UserRegistrationForm (Sentinel Identity)', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    currentMockState = getMockState();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, userId: '123' } });
  });

  it('renders correctly', () => {
    render(<UserRegistrationForm />);
    expect(screen.getByText(/Identidad de Personal/i)).toBeInTheDocument();
  });

  it('handles validation errors with partial data', async () => {
    render(<UserRegistrationForm />);
    const form = screen.getByTestId('registration-form');
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Ana Karen Flores Baca/i), {
      target: { value: 'Test User' },
    });
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(await screen.findByTestId('error-message')).toBeInTheDocument();
  });

  it('handles password mismatch validation', async () => {
    render(<UserRegistrationForm />);
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Ana Karen Flores Baca/i), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/aflores/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/ana.karen@piic.com.mx/i), {
      target: { value: 'test@t.com' },
    });

    const passInput = screen.getByPlaceholderText(/Auto-generada/i);
    fireEvent.change(passInput, { target: { value: 'password123' } });

    const confirmInput = screen.getByPlaceholderText(/Repita la clave/i);
    fireEvent.change(confirmInput, { target: { value: 'mismatch' } });

    expect(screen.getByText(/^No coincide$/i)).toBeInTheDocument();

    const form = screen.getByTestId('registration-form');
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(await screen.findByText(/Las contraseñas no coinciden/i)).toBeInTheDocument();
  });

  it('handles password match visual validation', async () => {
    render(<UserRegistrationForm />);
    const passInput = screen.getByPlaceholderText(/Auto-generada/i);
    fireEvent.change(passInput, { target: { value: 'password123' } });
    const confirmInput = screen.getByPlaceholderText(/Repita la clave/i);
    fireEvent.change(confirmInput, { target: { value: 'password123' } });

    expect(screen.queryByText(/^No coincide$/i)).toBeNull();
  });

  it('handles successful registration with file upload', async () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    render(<UserRegistrationForm />);

    fireEvent.change(screen.getByPlaceholderText(/Ej\. Ana Karen Flores Baca/i), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/aflores/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/ana.karen@piic.com.mx/i), {
      target: { value: 'test@t.com' },
    });

    fireEvent.change(screen.getByPlaceholderText(/EMP-XXX/i), { target: { value: '123' } });

    const uploaderZone = screen.getByText(/Arrastra/i).closest('div')?.parentElement;
    if (!uploaderZone) throw new Error('Uploader zone not found');
    const fileInput = uploaderZone.querySelector('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });

    expect(
      await screen.findByText(/Incorporación Exitosa/i, {}, { timeout: 8000 })
    ).toBeInTheDocument();
  });

  it('handles edit mode and successful audit update with file', async () => {
    currentMockState.editingUser = {
      id: '1',
      username: 'admin',
      fullName: 'Admin User',
      email: 'a@p.com',
      roleId: 1,
      department: 'IT',
    };
    render(<UserRegistrationForm />);

    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const uploaderZone = screen.getByText(/Arrastra/i).closest('div')?.parentElement;
    if (!uploaderZone) throw new Error('Uploader zone not found');
    const fileInput = uploaderZone.querySelector('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });

    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByPlaceholderText(/error en kilometraje/i), {
      target: { value: 'Valid update' },
    });

    await act(async () => {
      fireEvent.click(within(modal).getByText('Sincronizar'));
    });

    expect(currentMockState.updateUser).toHaveBeenCalled();
    expect(await screen.findByText(/Actualización Exitosa/i)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith(
      expect.stringContaining('/upload-profile'),
      expect.any(FormData),
      expect.any(Object)
    );
  });

  it('handles update failure (logic branch)', async () => {
    currentMockState.editingUser = {
      id: '1',
      username: 'admin',
      fullName: 'Admin User',
      email: 'a@p.com',
      roleId: 1,
      department: 'IT',
    };
    currentMockState.updateUser.mockResolvedValue(false);
    render(<UserRegistrationForm />);

    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByPlaceholderText(/error en kilometraje/i), {
      target: { value: 'Valid update' },
    });
    await act(async () => {
      fireEvent.click(within(modal).getByText('Sincronizar'));
    });

    expect(await screen.findByText(/Error de sincronización/i)).toBeInTheDocument();
  });

  it('handles edit mode and user deletion', async () => {
    currentMockState.editingUser = {
      id: '1',
      username: 'admin',
      fullName: 'Admin User',
      email: 'a@p.com',
      roleId: 1,
      department: 'IT',
    };
    render(<UserRegistrationForm />);

    fireEvent.click(screen.getByText(/Eliminar Personal/i));
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByPlaceholderText(/error en kilometraje/i), {
      target: { value: 'Delete reason' },
    });

    await act(async () => {
      fireEvent.click(within(modal).getByText('Confirmar Baja'));
    });
    expect(currentMockState.deleteUser).toHaveBeenCalled();
    expect(await screen.findByText(/Actualización Exitosa/i)).toBeInTheDocument();
  });

  it('handles delete failure (logic branch)', async () => {
    currentMockState.editingUser = {
      id: '1',
      username: 'admin',
      fullName: 'Admin User',
      email: 'a@p.com',
      roleId: 1,
      department: 'IT',
    };
    currentMockState.deleteUser.mockResolvedValue(false);
    render(<UserRegistrationForm />);

    fireEvent.click(screen.getByText(/Eliminar Personal/i));
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByPlaceholderText(/error en kilometraje/i), {
      target: { value: 'Delete reason' },
    });
    await act(async () => {
      fireEvent.click(within(modal).getByText('Confirmar Baja'));
    });

    expect(await screen.findByText(/Error al intentar eliminar/i)).toBeInTheDocument();
  });

  it('handles critical failure in handleConfirmAudit', async () => {
    currentMockState.editingUser = {
      id: '1',
      username: 'admin',
      fullName: 'Admin User',
      email: 'a@p.com',
      roleId: 1,
      department: 'IT',
    };
    currentMockState.updateUser.mockRejectedValue(new Error('Crash'));
    render(<UserRegistrationForm />);

    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByPlaceholderText(/error en kilometraje/i), {
      target: { value: 'Valid update' },
    });
    await act(async () => {
      fireEvent.click(within(modal).getByText('Sincronizar'));
    });

    expect(
      await screen.findByText(/Falla crítica en el protocolo de auditoría/i)
    ).toBeInTheDocument();
  });

  it('handles API errors during creation (success: false)', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { success: false, error: 'Custom Server Error' },
    });
    render(<UserRegistrationForm />);
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Ana Karen Flores Baca/i), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/aflores/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/ana.karen@piic.com.mx/i), {
      target: { value: 'test@t.com' },
    });
    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });
    expect(await screen.findByText(/Custom Server Error/i)).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<UserRegistrationForm />);
    const toggleButtons = screen.getAllByRole('button').filter((b) => b.querySelector('svg'));
    const toggleBtn = toggleButtons[0];
    const passwordInput = screen.getByPlaceholderText(/Auto-generada/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('allows canceling audit modal', async () => {
    currentMockState.editingUser = {
      id: '1',
      username: 'admin',
      fullName: 'Admin User',
      email: 'a@p.com',
      roleId: 1,
      department: 'IT',
    };
    render(<UserRegistrationForm />);
    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });

    const modal = await screen.findByRole('dialog');
    const cancelBtn = within(modal).getByRole('button', { name: /Cancelar/i });

    await act(async () => {
      fireEvent.click(cancelBtn);
    });
    await waitFor(
      () => {
        expect(screen.queryByRole('dialog')).toBeNull();
      },
      { timeout: 4000 }
    );
  });

  it('allows canceling form via main cancel button', () => {
    render(<UserRegistrationForm />);
    const cancelBtn = screen.getByText('Cancelar', { selector: 'button.btn-sentinel-red' });
    fireEvent.click(cancelBtn);
    expect(currentMockState.setActivePanel).toHaveBeenCalledWith('DIRECTORY');
    expect(currentMockState.setEditingUser).toHaveBeenCalledWith(null);
  });

  it('navigates back from success view', async () => {
    render(<UserRegistrationForm />);
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Ana Karen Flores Baca/i), {
      target: { value: 'T' },
    });
    fireEvent.change(screen.getByPlaceholderText(/aflores/i), { target: { value: 't' } });
    fireEvent.change(screen.getByPlaceholderText(/ana.karen@piic.com.mx/i), {
      target: { value: 't@t.com' },
    });
    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });
    const backBtn = await screen.findByText(/Volver al Directorio/i);
    fireEvent.click(backBtn);
    expect(currentMockState.setActivePanel).toHaveBeenCalledWith('DIRECTORY');
  });
});
