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
});
