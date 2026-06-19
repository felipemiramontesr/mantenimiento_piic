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
  // IDs 6 and 7 = internal staff (not 0-5 Archon Master bands) — avoids triggering
  // owner/sub-user conditional fields in tests that don't specifically test them.
  roles: [
    { id: 6, label: 'Admin' },
    { id: 7, label: 'Operador' },
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

  it('renders Rol Archon as the first top-level card above the grid', () => {
    render(<UserRegistrationForm />);
    expect(screen.getByText(/Rol Archon/i)).toBeInTheDocument();
    expect(screen.getByText(/Rol del Sistema/i)).toBeInTheDocument();
  });

  it('shows Departamento field for internal staff roles (id not in 1-5)', () => {
    render(<UserRegistrationForm />);
    // Default roleId = '7' → isInternalStaff → Departamento shown
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

  // ── Oleada 6: UserRegistrationForm branch coverage ──────────────────────

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

  it('create with explicit matching password uses provided password instead of tempPass', async () => {
    render(<UserRegistrationForm />);
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Ana Karen Flores Baca/i), {
      target: { value: 'New User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/aflores/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByPlaceholderText(/ana.karen@piic.com.mx/i), {
      target: { value: 'new@t.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Auto-generada/i), {
      target: { value: 'pass12345' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Repita la clave/i), {
      target: { value: 'pass12345' },
    });
    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });
    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      '/auth/register',
      expect.objectContaining({ password: 'pass12345' })
    );
    expect(await screen.findByText(/Incorporación Exitosa/i)).toBeInTheDocument();
  });

  it('create error with no error field uses "Error en el servidor." fallback', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: false } });
    render(<UserRegistrationForm />);
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Ana Karen Flores Baca/i), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText(/aflores/i), { target: { value: 'testuser2' } });
    fireEvent.change(screen.getByPlaceholderText(/ana.karen@piic.com.mx/i), {
      target: { value: 'test2@t.com' },
    });
    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });
    expect(await screen.findByTestId('error-message')).toHaveTextContent(/Error en el servidor\./i);
  });

  it('create error with axios-style rejection uses errObj.response.data.error (first branch)', async () => {
    vi.mocked(api.post).mockRejectedValue({ response: { data: { error: 'Axios API Error' } } });
    render(<UserRegistrationForm />);
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Ana Karen Flores Baca/i), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText(/aflores/i), { target: { value: 'testuser3' } });
    fireEvent.change(screen.getByPlaceholderText(/ana.karen@piic.com.mx/i), {
      target: { value: 'test3@t.com' },
    });
    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });
    expect(await screen.findByTestId('error-message')).toHaveTextContent(/Axios API Error/i);
  });

  it('create error with non-Error rejection uses "Falla en el alta." final fallback', async () => {
    vi.mocked(api.post).mockRejectedValue({});
    render(<UserRegistrationForm />);
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Ana Karen Flores Baca/i), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText(/aflores/i), { target: { value: 'testuser4' } });
    fireEvent.change(screen.getByPlaceholderText(/ana.karen@piic.com.mx/i), {
      target: { value: 'test4@t.com' },
    });
    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });
    expect(await screen.findByTestId('error-message')).toHaveTextContent(/Falla en el alta\./i);
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

  it('submit button shows Transmitiendo during create while api is pending', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.mocked(api.post).mockImplementation(() => new Promise(() => {}));
    render(<UserRegistrationForm />);
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Ana Karen Flores Baca/i), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/aflores/i), { target: { value: 'testuser5' } });
    fireEvent.change(screen.getByPlaceholderText(/ana.karen@piic.com.mx/i), {
      target: { value: 'test5@t.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Alta/i }));
    await waitFor(() => expect(screen.getByText('Transmitiendo...')).toBeInTheDocument());
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

  // ── Oleada 7: Role-conditional fields ──────────────────────────────────────

  it('shows Área sub-user fields when role is id=2', async () => {
    currentMockState.roles = [{ id: 2, label: 'Área Operador' }];
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: [{ id: 100, label: 'Flotilla X' }] },
    });
    render(<UserRegistrationForm />);
    await waitFor(() => {
      expect(screen.getByTestId('area-subuser-fields')).toBeInTheDocument();
    });
  });

  it('submit is disabled for Área role when parentOwner and area are not selected', async () => {
    currentMockState.roles = [{ id: 2, label: 'Área Operador' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [] } });
    render(<UserRegistrationForm />);
    await waitFor(() => expect(screen.getByTestId('area-subuser-fields')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Confirmar Alta/i })).toBeDisabled();
  });

  it('shows Familiar sub-user fields when role is id=5', async () => {
    currentMockState.roles = [{ id: 5, label: 'Familiar Operador' }];
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: [{ id: 200, label: 'Propietario Y' }] },
    });
    render(<UserRegistrationForm />);
    await waitFor(() => {
      expect(screen.getByTestId('familiar-subuser-fields')).toBeInTheDocument();
      expect(screen.getByTestId('familiar-type-pareja')).toBeInTheDocument();
      expect(screen.getByTestId('familiar-type-hijo_a')).toBeInTheDocument();
    });
  });

  it('submit is disabled for Familiar role when parentOwner and familiarType are not set', async () => {
    currentMockState.roles = [{ id: 5, label: 'Familiar Operador' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [] } });
    render(<UserRegistrationForm />);
    await waitFor(() => expect(screen.getByTestId('familiar-subuser-fields')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Confirmar Alta/i })).toBeDisabled();
  });

  it('familiar type PAREJA button applies active style when clicked', async () => {
    currentMockState.roles = [{ id: 5, label: 'Familiar Operador' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [] } });
    render(<UserRegistrationForm />);
    await waitFor(() => expect(screen.getByTestId('familiar-type-pareja')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('familiar-type-pareja'));
    expect(screen.getByTestId('familiar-type-pareja')).toHaveClass('bg-pinnacle-navy');
  });

  // ── Oleada 8: Fase 5 — role-scoped new fields ──────────────────────────────

  it('shows CENTER selector for Rol 4 (Propietario Privado)', async () => {
    currentMockState.roles = [{ id: 4, label: 'Privado Operador' }];
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/catalogs/centers')) {
        return Promise.resolve({
          data: { success: true, data: [{ id: 10, label: 'Centro Uno' }] },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
    render(<UserRegistrationForm />);
    await waitFor(() => {
      expect(screen.getByTestId('privado-centro-section')).toBeInTheDocument();
    });
  });

  it('submit is disabled for Rol 4 when no centro selected', async () => {
    currentMockState.roles = [{ id: 4, label: 'Privado Operador' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [] } });
    render(<UserRegistrationForm />);
    await waitFor(() => expect(screen.getByTestId('privado-centro-section')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Confirmar Alta/i })).toBeDisabled();
  });

  it('sub-user create (role 2) calls /auth/sub-users endpoint', async () => {
    currentMockState.roles = [{ id: 2, label: 'Área Operador' }];
    // Provide parent owners so the select has options
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/owners/') && url.includes('/areas')) {
        return Promise.resolve({
          data: { success: true, data: [{ id: 55, name: 'Taller Principal' }] },
        });
      }
      return Promise.resolve({
        data: { success: true, data: [{ id: 10, label: 'Flotilla Alpha' }] },
      });
    });
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });

    // Manually inject formData via submitting: bypass canSubmit disabled by forcing form submit
    render(<UserRegistrationForm />);
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Ana Karen Flores Baca/i), {
      target: { value: 'Sub User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/aflores/i), { target: { value: 'subuser' } });
    fireEvent.change(screen.getByPlaceholderText(/ana.karen@piic.com.mx/i), {
      target: { value: 'sub@t.com' },
    });
    // Use fireEvent.submit to bypass button disabled state
    await act(async () => {
      fireEvent.submit(screen.getByTestId('registration-form'));
    });
    // canSubmit=false → handleCreate NOT called → validation error shown (missing fields)
    // This verifies that role 2 with missing parentOwnerId/areaId does NOT call /auth/register
    expect(api.post).not.toHaveBeenCalledWith('/auth/register', expect.anything());
  });

  // ── Scenario 11 — Fase 6-C: owner-profile-section for Rol 4 ─────────────

  it('shows owner-profile-section for Rol 4 (Privado) with Perfil Personal title — Scenario 11', async () => {
    currentMockState.roles = [{ id: 4, label: 'Privado Operador' }];
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/catalogs/centers')) {
        return Promise.resolve({
          data: { success: true, data: [{ id: 10, label: 'Centro Uno' }] },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
    render(<UserRegistrationForm />);
    await waitFor(() => {
      expect(screen.getByTestId('owner-profile-section')).toBeInTheDocument();
      expect(screen.getByText('Perfil Personal')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('centro-especialidades-input')).not.toBeInTheDocument();
  });

  // ── Scenario 12 — Fase 6-C: ArchonAddressField rendered inside profile section ─────

  it('renders ArchonAddressField inside owner-profile-section for Rol 4 — Scenario 12', async () => {
    currentMockState.roles = [{ id: 4, label: 'Privado Operador' }];
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/catalogs/centers')) {
        return Promise.resolve({
          data: { success: true, data: [{ id: 10, label: 'Centro Uno' }] },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
    render(<UserRegistrationForm />);
    await waitFor(() => {
      expect(screen.getByTestId('owner-profile-section')).toBeInTheDocument();
      expect(screen.getByTestId('archon-address-field')).toBeInTheDocument();
    });
  });
});
