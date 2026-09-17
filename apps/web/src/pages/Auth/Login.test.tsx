import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router';
import LoginPage from './Login';
import api from '../../api/client';
import { AuthProvider } from '../../context/AuthContext';

vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
    defaults: {
      baseURL: 'https://apiv1.piic.com.mx/v1',
    },
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router');
  return {
    ...actual,
    useNavigate: (): ReturnType<typeof vi.fn> => mockNavigate,
  };
});

describe('LoginPage Component (ARCHON CORE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // AuthProvider calls /auth/refresh on mount — always reject (no active session)
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no session'));
  });

  const renderComponent = (): ReturnType<typeof render> =>
    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

  it('renders login form and inputs correctly', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('usuario o correo@empresa.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /acceder al sistema/i })).toBeInTheDocument();
  });

  it('FC183 — loads with empty, sanitized credential fields (no hardcoded defaults)', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('usuario o correo@empresa.com')).toHaveValue('');
    expect(screen.getByPlaceholderText('••••••••')).toHaveValue('');
  });

  it('shows cookie banner if cookies_accepted is not set and allows accepting', () => {
    renderComponent();
    const bannerText = screen.getByText(/Utilizamos cookies propias y de terceros/i);
    expect(bannerText).toBeInTheDocument();

    const acceptBtn = screen.getByRole('button', { name: /acePTAR/i });
    fireEvent.click(acceptBtn);

    expect(localStorage.getItem('cookies_accepted')).toBe('true');
    expect(screen.queryByText(/Utilizamos cookies propias y de terceros/i)).not.toBeInTheDocument();
  });

  it('hides cookie banner if cookies_accepted is true or user rejects', () => {
    localStorage.setItem('cookies_accepted', 'true');
    const { unmount } = renderComponent();
    expect(screen.queryByText(/Utilizamos cookies propias y de terceros/i)).not.toBeInTheDocument();
    unmount();

    // Test rejection
    localStorage.clear();
    renderComponent();
    const rejectBtn = screen.getByRole('button', { name: /RECHAZAR/i });
    fireEvent.click(rejectBtn);
    expect(screen.queryByText(/Utilizamos cookies propias y de terceros/i)).not.toBeInTheDocument();
  });

  it('handles successful login and redirects to /dashboard', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        token: 'mock-jwt-token',
        user: { id: 1, username: 'admin', roleName: 'Master (Archon)' },
      },
    });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('usuario o correo@empresa.com'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /acceder al sistema/i }));

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      username: 'admin',
      password: 'password123',
    });
    expect(screen.getByRole('button', { name: /autenticando archon/i })).toBeDisabled();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows a protocol error when the server response has no token', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { user: { id: 1, username: 'admin' } },
    });

    renderComponent();
    fireEvent.change(screen.getByPlaceholderText('usuario o correo@empresa.com'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /acceder al sistema/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /Error de protocolo: El servidor no devolvió una clave de acceso válida\./i
        )
      ).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard');
  });

  it('displays generic error on 401 Unauthorized', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { status: 401 },
    });

    renderComponent();
    fireEvent.submit(screen.getByRole('button', { name: /acceder al sistema/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Credenciales inválidas. Verifique su ID de Archon./i)
      ).toBeInTheDocument();
    });
  });

  it('displays connection error on 500 or network failure', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { status: 500 },
    });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('usuario o correo@empresa.com'), {
      target: { value: 'user' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /acceder al sistema/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Error de conexión. Intente de nuevo más tarde/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('usuario o correo@empresa.com')).not.toBeDisabled();
    expect(screen.getByPlaceholderText('••••••••')).not.toBeDisabled();
  });

  describe('FC185 F3 — mfaSetupRequired (Ω/MU sin MFA enrolado, invariante 4)', () => {
    const submitLogin = (): void => {
      fireEvent.change(screen.getByPlaceholderText('usuario o correo@empresa.com'), {
        target: { value: 'grayman' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'Archon2026!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /acceder al sistema/i }));
    };

    it('reemplaza el formulario por el asistente MFA en vez de navegar al dashboard', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url === '/auth/login') {
          return Promise.resolve({
            data: { success: true, mfaSetupRequired: true, setupToken: 'setup-token-1' },
          });
        }
        if (url === '/auth/mfa/setup') {
          return Promise.resolve({
            data: {
              success: true,
              data: { secretBase32: 'SECRET32', otpauthUri: 'otpauth://totp/x' },
            },
          });
        }
        return Promise.reject(new Error(`unexpected URL ${url}`));
      });

      renderComponent();
      submitLogin();

      expect(await screen.findByTestId('mfa-mandatory-setup')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('usuario o correo@empresa.com')).not.toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard');
      await waitFor(() => expect(screen.getByTestId('mfa-scan-step')).toBeInTheDocument());
    });

    it('defensivo — mfaSetupRequired sin setupToken: no revienta, cae de vuelta al formulario normal', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { success: true, mfaSetupRequired: true },
      });

      renderComponent();
      submitLogin();

      await waitFor(() => {
        expect(screen.queryByTestId('mfa-mandatory-setup')).not.toBeInTheDocument();
      });
      expect(screen.getByPlaceholderText('usuario o correo@empresa.com')).toBeInTheDocument();
    });

    it('completar el asistente regresa al formulario de login con el banner de éxito, contraseña vacía', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url === '/auth/login') {
          return Promise.resolve({
            data: { success: true, mfaSetupRequired: true, setupToken: 'setup-token-1' },
          });
        }
        if (url === '/auth/mfa/setup') {
          return Promise.resolve({
            data: {
              success: true,
              data: { secretBase32: 'SECRET32', otpauthUri: 'otpauth://totp/x' },
            },
          });
        }
        if (url === '/auth/mfa/confirm') {
          return Promise.resolve({
            data: { success: true, data: { backupCodes: ['AAAAA-11111'] } },
          });
        }
        return Promise.reject(new Error(`unexpected URL ${url}`));
      });

      renderComponent();
      submitLogin();

      await screen.findByTestId('mfa-scan-step');
      fireEvent.change(screen.getByLabelText(/código de 6 dígitos/i), {
        target: { value: '123456' },
      });
      fireEvent.click(screen.getByTestId('mfa-confirm-submit'));

      await screen.findByTestId('mfa-backup-codes-step');
      fireEvent.click(screen.getByTestId('mfa-backup-acknowledge'));
      fireEvent.click(screen.getByTestId('mfa-backup-continue'));

      expect(await screen.findByTestId('mfa-just-activated-banner')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toHaveValue('');
      expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('FC185 F4 — mfaRequired (usuario que YA tiene MFA confirmado)', () => {
    const submitLogin = (): void => {
      fireEvent.change(screen.getByPlaceholderText('usuario o correo@empresa.com'), {
        target: { value: 'archie' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pw' } });
      fireEvent.click(screen.getByRole('button', { name: /acceder al sistema/i }));
    };

    it('reemplaza el formulario por el desafío de 6 dígitos en vez de navegar directo', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { success: true, mfaRequired: true, mfaToken: 'mfa-token-1' },
      });

      renderComponent();
      submitLogin();

      expect(await screen.findByTestId('mfa-mandatory-challenge')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('usuario o correo@empresa.com')).not.toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard');
    });

    it('código válido: canjea por sesión completa y navega a /dashboard', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url === '/auth/login') {
          return Promise.resolve({
            data: { success: true, mfaRequired: true, mfaToken: 'mfa-token-1' },
          });
        }
        if (url === '/auth/mfa/verify') {
          return Promise.resolve({
            data: { success: true, token: 'session-token', user: { id: 501, username: 'archie' } },
          });
        }
        return Promise.reject(new Error(`unexpected URL ${url}`));
      });

      renderComponent();
      submitLogin();

      await screen.findByTestId('mfa-challenge-step');
      fireEvent.change(document.getElementById('mfa-challenge-code') as HTMLInputElement, {
        target: { value: '123456' },
      });
      fireEvent.click(screen.getByTestId('mfa-challenge-submit'));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
      expect(api.post).toHaveBeenCalledWith('/auth/mfa/verify', {
        mfaToken: 'mfa-token-1',
        code: '123456',
      });
    });

    it('código inválido: muestra el error del backend y se queda en el desafío (puede reintentar)', async () => {
      (api.post as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          data: { success: true, mfaRequired: true, mfaToken: 'mfa-token-1' },
        })
        .mockRejectedValueOnce({
          response: {
            data: { code: 'MFA_INVALID_CODE', message: 'El código ingresado no es válido' },
          },
        });

      renderComponent();
      submitLogin();

      await screen.findByTestId('mfa-challenge-step');
      fireEvent.change(document.getElementById('mfa-challenge-code') as HTMLInputElement, {
        target: { value: '000000' },
      });
      fireEvent.click(screen.getByTestId('mfa-challenge-submit'));

      expect(await screen.findByText('El código ingresado no es válido')).toBeInTheDocument();
      expect(screen.getByTestId('mfa-challenge-step')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard');
    });

    it('reto revocado/expirado en el backend: regresa al login con el banner de expiración visible', async () => {
      (api.post as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          data: { success: true, mfaRequired: true, mfaToken: 'mfa-token-1' },
        })
        .mockRejectedValueOnce({
          response: {
            data: { code: 'TOKEN_EXPIRED_OR_REVOKED', message: 'El reto expiró' },
          },
        });

      renderComponent();
      submitLogin();

      await screen.findByTestId('mfa-challenge-step');
      fireEvent.change(document.getElementById('mfa-challenge-code') as HTMLInputElement, {
        target: { value: '000000' },
      });
      fireEvent.click(screen.getByTestId('mfa-challenge-submit'));

      expect(await screen.findByTestId('mfa-challenge-expired-banner')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('usuario o correo@empresa.com')).toBeInTheDocument();
    });

    it('"Volver" regresa al formulario de login sin banner de expiración (salida manual, no timeout)', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { success: true, mfaRequired: true, mfaToken: 'mfa-token-1' },
      });

      renderComponent();
      submitLogin();

      await screen.findByTestId('mfa-challenge-step');
      fireEvent.click(screen.getByTestId('mfa-challenge-back'));

      expect(
        await screen.findByPlaceholderText('usuario o correo@empresa.com')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('mfa-challenge-expired-banner')).not.toBeInTheDocument();
    });
  });
});
