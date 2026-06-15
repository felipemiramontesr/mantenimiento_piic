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

  // ── Oleada 6: UserRegistrationForm branch coverage ──────────────────────

  it('update with password and no file: sends password to updateUser and skips upload (lines 143/149)', async () => {
    currentMockState.editingUser = {
      id: '2',
      username: 'user2',
      fullName: 'User Two',
      email: 'u2@p.com',
      roleId: 1,
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
    // line 143 truthy: formData.password = 'newpass123' → passes password to updateUser
    expect(currentMockState.updateUser).toHaveBeenCalledWith(
      '2',
      expect.objectContaining({ password: 'newpass123' }),
      'Password change reason'
    );
    // line 149 false: selectedFile=null → no upload-profile call
    expect(api.post).not.toHaveBeenCalledWith(
      expect.stringContaining('/upload-profile'),
      expect.any(FormData),
      expect.any(Object)
    );
    expect(await screen.findByText(/Actualización Exitosa/i)).toBeInTheDocument();
  });

  it('create with explicit matching password uses provided password instead of tempPass (line 181)', async () => {
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
    // line 181 truthy: formData.password = 'pass12345' → api.post receives it directly
    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      '/auth/register',
      expect.objectContaining({ password: 'pass12345' })
    );
    expect(await screen.findByText(/Incorporación Exitosa/i)).toBeInTheDocument();
  });

  it('create error with no error field uses "Error en el servidor." fallback (line 197)', async () => {
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
    // line 197: response.data.error is undefined → 'Error en el servidor.' (falsy branch)
    expect(await screen.findByTestId('error-message')).toHaveTextContent(/Error en el servidor\./i);
  });

  it('create error with axios-style rejection uses errObj.response.data.error (line 241 first branch)', async () => {
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
    // line 241: errObj.response?.data?.error = 'Axios API Error' → truthy → first OR branch
    expect(await screen.findByTestId('error-message')).toHaveTextContent(/Axios API Error/i);
  });

  it('create error with non-Error rejection uses "Falla en el alta." final fallback (line 241)', async () => {
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
    // line 241: response=undefined, message=undefined → 'Falla en el alta.' (final fallback)
    expect(await screen.findByTestId('error-message')).toHaveTextContent(/Falla en el alta\./i);
  });

  it('editingUser with imageUrl renders image in uploader and removal clears it (lines 338/340)', async () => {
    currentMockState.editingUser = {
      id: '3',
      username: 'photo_user',
      fullName: 'Photo User',
      email: 'photo@p.com',
      roleId: 1,
      department: 'IT',
      imageUrl: 'http://example.com/photo.jpg',
    };
    const { container } = render(<UserRegistrationForm />);
    // line 338 truthy: formData.imageUrl = 'http://...' → images=['http://...'] passed to uploader
    // Wait for useEffect to set formData.imageUrl and commit the re-render
    await waitFor(() => {
      expect(container.querySelector('img[alt="Vista 1"]')).not.toBeNull();
    });
    // Find remove button via closest .relative slot (works for both circle and square variants)
    const imgElem = container.querySelector('img[alt="Vista 1"]') as HTMLImageElement;
    const imgSlot = imgElem.closest('.relative') as HTMLElement;
    const removeBtn = imgSlot.querySelector('button') as HTMLButtonElement;
    expect(removeBtn).toBeInTheDocument();
    // Click remove → onChange([]) → line 340: imgs[0] = undefined → '' (falsy branch)
    fireEvent.click(removeBtn);
    await waitFor(() => {
      expect(container.querySelector('img[alt="Vista 1"]')).not.toBeInTheDocument();
    });
  });

  it('submit button shows Transmitiendo during create while api is pending (line 490 truthy)', async () => {
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
    // Click submit (without await/act so we can capture the in-flight state)
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Alta/i }));
    // line 490: isSubmitting=true → 'Transmitiendo...' text appears on button
    await waitFor(() => expect(screen.getByText('Transmitiendo...')).toBeInTheDocument());
  });

  it('submit button is disabled when password set but shorter than 8 chars (line 250 false branch)', () => {
    render(<UserRegistrationForm />);
    fireEvent.change(screen.getByPlaceholderText(/Auto-generada/i), { target: { value: 'ab' } });
    fireEvent.change(screen.getByPlaceholderText(/Repita la clave/i), { target: { value: 'ab' } });
    // passwordsMatch=true, length=2 < 8 → canSubmit = false → button disabled (line 250 false branch)
    expect(screen.getByRole('button', { name: /Confirmar Alta/i })).toBeDisabled();
  });

  it('confirm password input type follows showPassword toggle (line 427 truthy branch)', () => {
    render(<UserRegistrationForm />);
    // Fill password to make confirm field appear (line 427 rendered)
    fireEvent.change(screen.getByPlaceholderText(/Auto-generada/i), {
      target: { value: 'mypassword' },
    });
    const confirmInput = screen.getByPlaceholderText(/Repita la clave/i);
    // line 427 false branch: showPassword=false → type='password'
    expect(confirmInput).toHaveAttribute('type', 'password');
    // Click toggle (first svg-bearing button is the Eye/EyeOff toggle)
    const toggleBtn = screen.getAllByRole('button').filter((b) => b.querySelector('svg'))[0];
    fireEvent.click(toggleBtn);
    // line 427 truthy branch: showPassword=true → type='text'
    expect(confirmInput).toHaveAttribute('type', 'text');
  });
});
