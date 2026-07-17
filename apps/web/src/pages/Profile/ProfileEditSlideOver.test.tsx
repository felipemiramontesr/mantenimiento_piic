import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import ProfileEditSlideOver from './ProfileEditSlideOver';

/**
 * FC 076 F2 (R6) — Contract-shape tests. El payload previo fallaba por 3
 * vías simultáneas: plano sin {data, reason} · uuid donde la ruta resuelve
 * id numérico · campo username inexistente en el schema.
 */

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return { ...actual, useAuth: mockUseAuth };
});

const mockPatch = vi.hoisted(() => vi.fn());
vi.mock('../../api/client', () => ({
  default: { patch: mockPatch },
}));

const CURRENT_USER = {
  id: 29,
  uuid: 'abc-uuid-123',
  username: 'GrayMan',
  email: 'gm@test.mx',
};

describe('ProfileEditSlideOver — contrato PATCH /auth/users/:id (FC 076 R6)', () => {
  const updateCurrentUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ currentUser: CURRENT_USER, updateCurrentUser });
    mockPatch.mockResolvedValue({ status: 200, data: { success: true } });
  });

  it('envía {data, reason} al id NUMÉRICO — nunca al uuid, nunca username', async () => {
    render(<ProfileEditSlideOver isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByTestId('profile-edit-email'), {
      target: { value: 'Nuevo@Correo.MX' },
    });
    fireEvent.click(screen.getByTestId('profile-edit-save'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    const [url, body] = mockPatch.mock.calls[0];
    expect(url).toBe('/auth/users/29');
    expect(url).not.toContain('abc-uuid-123');
    expect(body).toEqual({
      data: { email: 'nuevo@correo.mx' },
      reason: expect.any(String),
    });
    expect((body as { reason: string }).reason.length).toBeGreaterThanOrEqual(5);
    expect((body as { data: Record<string, unknown> }).data.username).toBeUndefined();
  });

  it('el campo username queda deshabilitado (inalterable)', () => {
    render(<ProfileEditSlideOver isOpen onClose={vi.fn()} />);
    expect(screen.getByTestId('profile-edit-username')).toBeDisabled();
  });

  it('muestra éxito y sincroniza email en contexto tras 200', async () => {
    render(<ProfileEditSlideOver isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId('profile-edit-save'));

    expect(await screen.findByTestId('profile-edit-success')).toBeInTheDocument();
    expect(updateCurrentUser).toHaveBeenCalledWith({ email: 'gm@test.mx' });
  });

  it('muestra error sin romper cuando el PATCH falla', async () => {
    mockPatch.mockRejectedValue(new Error('500'));
    render(<ProfileEditSlideOver isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId('profile-edit-save'));

    expect(await screen.findByTestId('profile-edit-error')).toBeInTheDocument();
  });
});
