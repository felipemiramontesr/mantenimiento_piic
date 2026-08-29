import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import ArchonProfilePanel from './ArchonProfilePanel';

/**
 * FC 076 F2 — Contract-shape tests (Cond. Bravo: asserts sobre el body
 * EXACTO enviado al mock). El bug R1 (payload plano sin {data, reason})
 * vivió sin detección precisamente porque no existía este archivo.
 */

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return { ...actual, useAuth: mockUseAuth };
});

const mockPatch = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
vi.mock('../../api/client', () => ({
  default: {
    patch: mockPatch,
    post: mockPost,
    defaults: { baseURL: 'http://test/v1' },
  },
}));

const mockCompressImage = vi.hoisted(() => vi.fn());
vi.mock('../../utils/imageUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/imageUtils')>();
  return { ...actual, compressImage: mockCompressImage };
});

const CURRENT_USER = {
  id: 29,
  uuid: 'test-uuid',
  username: 'GrayMan',
  fullName: 'Gray Man',
  email: 'gm@test.mx',
  employeeNumber: 'EMP-1',
  roleId: 0,
  roleName: 'Master (Archon)',
};

const submitForm = (): void => {
  fireEvent.click(screen.getByRole('button', { name: /actualizar perfil/i }));
};

describe('ArchonProfilePanel — contrato PATCH /auth/users/:id (FC 076 R1)', () => {
  const updateCurrentUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ currentUser: CURRENT_USER, updateCurrentUser });
    mockPatch.mockResolvedValue({ status: 200, data: { success: true } });
  });

  it('envía el envoltorio {data, reason} exacto que exige el backend', async () => {
    render(<ArchonProfilePanel />);
    submitForm();

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    const [url, body] = mockPatch.mock.calls[0];
    expect(url).toBe('/auth/users/29');
    expect(body).toEqual({
      data: {
        fullName: 'Gray Man',
        email: 'gm@test.mx',
        employeeNumber: 'EMP-1',
      },
      reason: expect.any(String),
    });
    // Cond.4 Bravo: reason fijo ≥5 chars
    expect((body as { reason: string }).reason.length).toBeGreaterThanOrEqual(5);
  });

  it('incluye password dentro de data SOLO cuando el usuario la captura', async () => {
    render(<ArchonProfilePanel />);

    const pwdInput = screen.getByPlaceholderText('Dejar vacío para mantener actual');
    fireEvent.change(pwdInput, { target: { value: 'NuevaClave123!' } });

    // El campo de confirmación aparece al capturar password; debe coincidir
    // para habilitar el submit (canSubmit).
    const confirmLabel = await screen.findByText(/confirmar nueva contraseña/i);
    expect(confirmLabel).toBeInTheDocument();
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(passwordInputs[1], { target: { value: 'NuevaClave123!' } });

    submitForm();

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    const [, body] = mockPatch.mock.calls[0];
    expect((body as { data: Record<string, string> }).data.password).toBe('NuevaClave123!');
  });

  it('NUNCA envía la foto en el PATCH (ni plana ni en data) — su canal es upload-profile', async () => {
    render(<ArchonProfilePanel />);
    submitForm();

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    const [, body] = mockPatch.mock.calls[0] as [
      string,
      { data: Record<string, unknown> } & Record<string, unknown>
    ];
    expect(body.profile_picture_url).toBeUndefined();
    expect(body.profilePictureUrl).toBeUndefined();
    expect(body.data.profile_picture_url).toBeUndefined();
    expect(body.data.profilePictureUrl).toBeUndefined();
  });

  it('muestra éxito tras un PATCH 200 con el contrato nuevo', async () => {
    render(<ArchonProfilePanel />);
    submitForm();

    expect(await screen.findByText(/perfil actualizado con éxito/i)).toBeInTheDocument();
    expect(updateCurrentUser).toHaveBeenCalledWith({
      fullName: 'Gray Man',
      email: 'gm@test.mx',
      employeeNumber: 'EMP-1',
    });
  });

  // ── R4-C Fc162 — Sonar unc lines 110-130,137,194,213,223-224,255,275 ──
  it('AT-APP-FIELDS-1: escribir en Nombre/No. Empleado/Correo actualiza formData', () => {
    render(<ArchonProfilePanel />);

    const fullNameInput = screen.getByDisplayValue('Gray Man');
    fireEvent.change(fullNameInput, { target: { value: 'Gray Man Updated' } });
    expect(fullNameInput).toHaveValue('Gray Man Updated');

    const empInput = screen.getByDisplayValue('EMP-1');
    fireEvent.change(empInput, { target: { value: 'EMP-2' } });
    expect(empInput).toHaveValue('EMP-2');

    const emailInput = screen.getByDisplayValue('gm@test.mx');
    fireEvent.change(emailInput, { target: { value: 'new@test.mx' } });
    expect(emailInput).toHaveValue('new@test.mx');
  });

  it('AT-APP-PWTOGGLE-1: el botón mostrar/ocultar contraseña alterna el tipo de input', () => {
    render(<ArchonProfilePanel />);
    const pwdInput = screen.getByPlaceholderText('Dejar vacío para mantener actual');
    expect(pwdInput).toHaveAttribute('type', 'password');

    const toggleBtn = pwdInput.parentElement!.querySelector('button') as HTMLButtonElement;
    fireEvent.click(toggleBtn);
    expect(pwdInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleBtn);
    expect(pwdInput).toHaveAttribute('type', 'password');
  });

  it('AT-APP-CROP-1: selecciona y recorta una foto de perfil, actualizando el preview local', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,cropped'
    );

    const { container } = render(<ArchonProfilePanel />);
    const file = new File(['(⌐□_□)'], 'photo.png', { type: 'image/png' });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await screen.findByTestId('archon-crop-modal');
    fireEvent.click(screen.getByTestId('crop-confirm'));

    await waitFor(() => {
      expect(screen.queryByTestId('archon-crop-modal')).not.toBeInTheDocument();
    });
  });

  it('AT-APP-UPLOAD-1: tras un PATCH exitoso con una foto seleccionada, comprime y sube la imagen, actualizando el avatar', async () => {
    mockCompressImage.mockResolvedValueOnce({
      base64: 'data:image/jpeg;base64,zzz',
      mime: 'image/jpeg',
    });
    mockPost.mockImplementation((url: string) => {
      if (url === 'users/29/upload-profile') {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.resolve({ data: { success: false } });
    });

    const { container } = render(<ArchonProfilePanel />);
    const file = new File(['(⌐□_□)'], 'photo.png', { type: 'image/png' });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    submitForm();

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('users/29/upload-profile', {
        image: 'data:image/jpeg;base64,zzz',
        mime: 'image/jpeg',
      });
    });
    await waitFor(() => {
      expect(updateCurrentUser).toHaveBeenCalledWith({
        imageUrl: 'http://test/v1/users/29/profile-image',
      });
    });
  });

  it('AT-APP-UPLOAD-2: si la subida de la imagen falla tras el PATCH exitoso, muestra el error específico con el ID de referencia', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation((): void => {});
    mockCompressImage.mockResolvedValueOnce({
      base64: 'data:image/jpeg;base64,zzz',
      mime: 'image/jpeg',
    });
    mockPost.mockImplementation((url: string) => {
      if (url === 'users/29/upload-profile') {
        return Promise.reject(new Error('upload failed'));
      }
      return Promise.resolve({ data: { success: false } });
    });

    const { container } = render(<ArchonProfilePanel />);
    const file = new File(['(⌐□_□)'], 'photo.png', { type: 'image/png' });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    submitForm();

    await waitFor(() => {
      expect(
        screen.getByText(/Datos guardados, pero error al procesar la imagen \(ID Ref: 29\)/)
      ).toBeInTheDocument();
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('AT-APP-OUTERERR-1: si el PATCH principal falla, muestra el error crítico genérico', async () => {
    mockPatch.mockRejectedValueOnce(new Error('network down'));
    render(<ArchonProfilePanel />);
    submitForm();

    await waitFor(() => {
      expect(
        screen.getByText('Falla crítica al sincronizar la identidad. Verifique su conexión.')
      ).toBeInTheDocument();
    });
  });

  /**
   * FC165 F2 Slice 2.1C (3/5) — branch coverage completion. 18 uncovered
   * conditions (matches Alfa's census exactly). All test-only, 0 source
   * edits.
   */
  describe('branch coverage (FC165 F2 Slice 2.1C)', () => {
    it('renders and no-ops safely (guards both the hydration effect and handleFormSubmit) when currentUser is null', async () => {
      mockUseAuth.mockReturnValue({ currentUser: null, updateCurrentUser });
      render(<ArchonProfilePanel />);

      // currentUser?.username / ?.roleName fallbacks
      expect(screen.getByText('Actualizar Perfil')).toBeInTheDocument();
      expect(screen.getByText('Usuario')).toBeInTheDocument();

      // fill the HTML5-required fields so the browser lets the submit event
      // through at all — otherwise native validation blocks it before
      // handleFormSubmit's own `if (!currentUser) return;` guard ever runs.
      const [nameInput, emailInput] = document.querySelectorAll('input[required]');
      fireEvent.change(nameInput, { target: { value: 'Alguien' } });
      fireEvent.change(emailInput, { target: { value: 'alguien@test.mx' } });

      submitForm();
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      expect(mockPatch).not.toHaveBeenCalled();
    });

    it('hydrates from snake_case fields when the camelCase ones are absent', async () => {
      mockUseAuth.mockReturnValue({
        currentUser: {
          id: 30,
          username: 'snake.case',
          full_name: 'Snake Case Name',
          employee_number: 'EMP-SNAKE',
          email: 'snake@test.mx',
        },
        updateCurrentUser,
      });
      render(<ArchonProfilePanel />);

      await waitFor(() => expect(screen.getByDisplayValue('Snake Case Name')).toBeInTheDocument());
      expect(screen.getByDisplayValue('EMP-SNAKE')).toBeInTheDocument();
    });

    it('hydrates to empty strings when fullName/employeeNumber/email are all absent (both fallback levels)', async () => {
      mockUseAuth.mockReturnValue({
        currentUser: { id: 31, username: 'bare.user' },
        updateCurrentUser,
      });
      render(<ArchonProfilePanel />);

      await waitFor(() => expect(screen.getByDisplayValue('bare.user')).toBeInTheDocument());
      // fullName/employeeNumber/email all resolved to '' — no crash, the
      // required-field inputs render empty rather than "undefined".
      expect(document.querySelectorAll('input[required]')).not.toHaveLength(0);
    });

    it('does not call updateCurrentUser when the PATCH resolves with success:false and a non-200 status', async () => {
      mockPatch.mockResolvedValue({ status: 400, data: { success: false } });
      render(<ArchonProfilePanel />);
      submitForm();

      await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      expect(updateCurrentUser).not.toHaveBeenCalled();
      expect(screen.queryByText(/perfil actualizado con éxito/i)).not.toBeInTheDocument();
    });

    it('does not call updateCurrentUser with a new imageUrl when the upload response has neither success nor url', async () => {
      mockCompressImage.mockResolvedValueOnce({
        base64: 'data:image/jpeg;base64,zzz',
        mime: 'image/jpeg',
      });
      mockPost.mockResolvedValue({ data: { success: false } });

      const { container } = render(<ArchonProfilePanel />);
      const file = new File(['(⌐□_□)'], 'photo.png', { type: 'image/png' });
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      submitForm();

      await waitFor(() => expect(mockPost).toHaveBeenCalled());
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      expect(updateCurrentUser).not.toHaveBeenCalledWith(
        expect.objectContaining({ imageUrl: expect.anything() })
      );
    });

    it("removing the current profile photo calls onChange([]) and falls back imageUrl to ''", async () => {
      mockUseAuth.mockReturnValue({
        currentUser: { ...CURRENT_USER, imageUrl: 'http://cdn.test/photo.jpg' },
        updateCurrentUser,
      });
      render(<ArchonProfilePanel />);

      const thumb = await screen.findByAltText('Vista 1');
      const removeBtn = thumb.parentElement!.parentElement!.querySelector(
        'button'
      ) as HTMLButtonElement;
      fireEvent.click(removeBtn);

      await waitFor(() => expect(screen.queryByAltText('Vista 1')).not.toBeInTheDocument());
    });

    it('shows the mismatch styling, "No coincide" label, and reveals the confirm field as plain text when showPassword is toggled', async () => {
      render(<ArchonProfilePanel />);

      const pwdInput = screen.getByPlaceholderText('Dejar vacío para mantener actual');
      fireEvent.change(pwdInput, { target: { value: 'ClaveNueva123' } });

      const confirmLabel = await screen.findByText(/confirmar nueva contraseña/i);
      expect(confirmLabel).toBeInTheDocument();
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      const confirmInput = passwordInputs[1] as HTMLInputElement;
      fireEvent.change(confirmInput, { target: { value: 'NoCoincide456' } });

      expect(screen.getByText('No coincide')).toBeInTheDocument();
      expect(confirmInput.className).toContain('border-red-200');

      const toggleBtn = pwdInput.parentElement!.querySelector('button') as HTMLButtonElement;
      fireEvent.click(toggleBtn);

      const revealedInputs = document.querySelectorAll('input[type="text"]');
      expect(
        Array.from(revealedInputs).some((el) => (el as HTMLInputElement).value === 'NoCoincide456')
      ).toBe(true);
    });
  });
});
