import React from 'react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { screen, fireEvent, waitFor, cleanup, within, act, render } from '../../test/testUtils';
import api from '../../api/client';
import { compressImage } from '../../utils/imageUtils';
import UserRegistrationForm, { buildTempPassword } from './UserRegistrationForm';

/**
 * FC 082 F0c — el ALTA murió con POST /auth/register y /auth/sub-users
 * (084_AN §1a): los tests de creación/sub-usuarios/familiar/centro fueron
 * purgados con sus ramas. Sobreviven los flujos de EDICIÓN (update/delete/
 * auditoría), la validación de contraseñas y buildTempPassword; se agrega el
 * gate de puerta-cerrada (F0c-URF-1).
 */

// 🔱 Mock API Client
vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    post: vi.fn().mockResolvedValue({ data: { success: true, userId: '123' } }),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

// FC 076 F2 — compressImage usa canvas (inexistente en jsdom); el contrato
// upload es JSON {image, mime}, verificado por los asserts de payload abajo.
// mockReset:true (vite.config) borra implementaciones → se re-arma en beforeEach.
vi.mock('../../utils/imageUtils', () => ({
  compressImage: vi.fn(),
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
  departmentsCatalog: { id: number; label: string }[];
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
  departmentsCatalog: [
    { id: 41, label: 'IT' },
    { id: 42, label: 'Sistemas' },
  ],
  roles: [
    { id: 0, label: 'GrayMan' },
    { id: 6, label: 'Admin' },
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
    vi.mocked(compressImage).mockResolvedValue({ base64: 'B64DATA', mime: 'image/jpeg' });
  });

  it('renders correctly', () => {
    render(<UserRegistrationForm />);
    expect(screen.getByText(/Identidad de Personal/i)).toBeInTheDocument();
  });

  it('renders Rol Archon as the first top-level card above the grid', () => {
    render(<UserRegistrationForm />);
    expect(screen.getByText(/Rol Archon/i)).toBeInTheDocument();
    expect(screen.getByText(/Rol del Sistema/i)).toBeInTheDocument();
  });

  it('shows Departamento field (siempre visible tras la purga de bandas)', () => {
    render(<UserRegistrationForm />);
    expect(screen.getByText(/Departamento/i)).toBeInTheDocument();
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

  it('F0c-URF-1: alta con datos completos muestra puerta cerrada FC 082 y NO llama la API', async () => {
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
    expect(await screen.findByTestId('error-message')).toHaveTextContent(
      /alta de usuarios está deshabilitada/i
    );
    // El AuthProvider dispara /auth/refresh al montar; lo que NO debe existir
    // es ninguna llamada de alta (register/sub-users murieron en F0c).
    expect(api.post).not.toHaveBeenCalledWith('/auth/register', expect.anything());
    expect(api.post).not.toHaveBeenCalledWith('/auth/sub-users', expect.anything());
  });

  it('handles password mismatch visual validation', async () => {
    render(<UserRegistrationForm />);
    const passInput = screen.getByPlaceholderText(/Auto-generada/i);
    fireEvent.change(passInput, { target: { value: 'password123' } });

    const confirmInput = screen.getByPlaceholderText(/Repita la clave/i);
    fireEvent.change(confirmInput, { target: { value: 'mismatch' } });

    expect(screen.getByText(/^No coincide$/i)).toBeInTheDocument();
  });

  it('handles password match visual validation', async () => {
    render(<UserRegistrationForm />);
    const passInput = screen.getByPlaceholderText(/Auto-generada/i);
    fireEvent.change(passInput, { target: { value: 'password123' } });
    const confirmInput = screen.getByPlaceholderText(/Repita la clave/i);
    fireEvent.change(confirmInput, { target: { value: 'password123' } });

    expect(screen.queryByText(/^No coincide$/i)).toBeNull();
  });

  it('FC 076 S1 — buildTempPassword garantiza las 4 clases R3_* en toda corrida', () => {
    // 200 corridas: la versión previa fallaba ~15-20% por clase faltante
    for (let i = 0; i < 200; i += 1) {
      const pwd = buildTempPassword(12);
      expect(pwd).toHaveLength(12);
      expect(pwd).toMatch(/[A-Z]/);
      expect(pwd).toMatch(/[a-z]/);
      expect(pwd).toMatch(/\d/);
      expect(pwd).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it('handles edit mode and successful audit update with file', async () => {
    currentMockState.editingUser = {
      id: '1',
      username: 'admin',
      fullName: 'Admin User',
      email: 'a@p.com',
      roleId: 0,
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
    // FC 076 R2 — el upload al EDITAR viaja como JSON {image, mime}, jamás
    // multipart (el assert previo de FormData codificaba el bug).
    expect(api.post).toHaveBeenCalledWith('/users/1/upload-profile', {
      image: 'B64DATA',
      mime: 'image/jpeg',
    });
  });

  it('handles update failure (logic branch)', async () => {
    currentMockState.editingUser = {
      id: '1',
      username: 'admin',
      fullName: 'Admin User',
      email: 'a@p.com',
      roleId: 0,
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
      roleId: 0,
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
      roleId: 0,
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
      roleId: 0,
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
      roleId: 0,
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

  it('navigates back from success view (flujo de edición)', async () => {
    currentMockState.editingUser = {
      id: '1',
      username: 'admin',
      fullName: 'Admin User',
      email: 'a@p.com',
      roleId: 0,
      department: 'IT',
    };
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
    const backBtn = await screen.findByText(/Volver al Directorio/i);
    fireEvent.click(backBtn);
    expect(currentMockState.setActivePanel).toHaveBeenCalledWith('DIRECTORY');
  });

  it('update with password and no file: sends password to updateUser and skips upload', async () => {
    currentMockState.editingUser = {
      id: '2',
      username: 'user2',
      fullName: 'User Two',
      email: 'u2@p.com',
      roleId: 6,
      department: 'IT',
    };
    render(<UserRegistrationForm />);
    fireEvent.change(screen.getByPlaceholderText(/Dejar vacío para no cambiar/i), {
      target: { value: 'newpass123' },
    });
    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByPlaceholderText(/error en kilometraje/i), {
      target: { value: 'Password change reason' },
    });
    await act(async () => {
      fireEvent.click(within(modal).getByText('Sincronizar'));
    });
    expect(currentMockState.updateUser).toHaveBeenCalledWith(
      '2',
      expect.objectContaining({ password: 'newpass123' }),
      'Password change reason'
    );
    expect(api.post).not.toHaveBeenCalledWith(
      expect.stringContaining('/upload-profile'),
      expect.any(FormData),
      expect.any(Object)
    );
    expect(await screen.findByText(/Actualización Exitosa/i)).toBeInTheDocument();
  });

  it('editingUser with imageUrl renders image in uploader and removal clears it', async () => {
    currentMockState.editingUser = {
      id: '3',
      username: 'photo_user',
      fullName: 'Photo User',
      email: 'photo@p.com',
      roleId: 6,
      department: 'IT',
      imageUrl: 'http://example.com/photo.jpg',
    };
    const { container } = render(<UserRegistrationForm />);
    await waitFor(() => {
      expect(container.querySelector('img[alt="Vista 1"]')).not.toBeNull();
    });
    const imgElem = container.querySelector('img[alt="Vista 1"]') as HTMLImageElement;
    const imgSlot = imgElem.closest('.relative') as HTMLElement;
    const removeBtn = imgSlot.querySelector('button') as HTMLButtonElement;
    expect(removeBtn).toBeInTheDocument();
    fireEvent.click(removeBtn);
    await waitFor(() => {
      expect(container.querySelector('img[alt="Vista 1"]')).not.toBeInTheDocument();
    });
  });

  it('submit button is disabled when password set but shorter than 8 chars', () => {
    render(<UserRegistrationForm />);
    fireEvent.change(screen.getByPlaceholderText(/Auto-generada/i), { target: { value: 'ab' } });
    fireEvent.change(screen.getByPlaceholderText(/Repita la clave/i), { target: { value: 'ab' } });
    expect(screen.getByRole('button', { name: /Confirmar Alta/i })).toBeDisabled();
  });

  it('confirm password input type follows showPassword toggle', () => {
    render(<UserRegistrationForm />);
    fireEvent.change(screen.getByPlaceholderText(/Auto-generada/i), {
      target: { value: 'mypassword' },
    });
    const confirmInput = screen.getByPlaceholderText(/Repita la clave/i);
    expect(confirmInput).toHaveAttribute('type', 'password');
    const toggleBtn = screen.getAllByRole('button').filter((b) => b.querySelector('svg'))[0];
    fireEvent.click(toggleBtn);
    expect(confirmInput).toHaveAttribute('type', 'text');
  });
});
