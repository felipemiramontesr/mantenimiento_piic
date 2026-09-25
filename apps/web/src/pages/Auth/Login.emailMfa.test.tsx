import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router';
import LoginPage from './Login';
import api from '../../api/client';
import { AuthProvider } from '../../context/AuthContext';

/**
 * FC195 F3 — `/login` con los campos nuevos del backend: `allowedMethods` (enrolamiento obligatorio
 * de un Arc: puede elegir correo) y `channel`/`maskedEmail`/`codeSent` (reto por correo).
 */

vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
    defaults: { baseURL: 'https://apiv1.piic.com.mx/v1' },
  },
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router');
  return { ...actual, useNavigate: (): ReturnType<typeof vi.fn> => vi.fn() };
});

const post = api.post as ReturnType<typeof vi.fn>;

function renderAndSubmit(): void {
  render(
    <AuthProvider>
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    </AuthProvider>
  );
  fireEvent.change(screen.getByPlaceholderText('usuario o correo@empresa.com'), {
    target: { value: 'arc' },
  });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pw' } });
  fireEvent.click(screen.getByRole('button', { name: /acceder al sistema/i }));
}

describe('LoginPage — 2FA por correo (FC195 F3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    post.mockRejectedValueOnce(new Error('no session'));
  });

  it('Arc sin 2FA (allowedMethods con correo): el asistente abre con el selector de método', async () => {
    post.mockResolvedValueOnce({
      data: {
        success: true,
        mfaSetupRequired: true,
        setupToken: 'setup-1',
        allowedMethods: ['totp', 'email'],
      },
    });

    renderAndSubmit();

    expect(await screen.findByTestId('mfa-method-choice')).toBeInTheDocument();
  });

  it('Scenario 3 — reto por correo: muestra a dónde se envió y el reenvío', async () => {
    post.mockResolvedValueOnce({
      data: {
        success: true,
        mfaRequired: true,
        mfaToken: 'mfa-1',
        channel: 'email',
        maskedEmail: 'ar•••@piic.com.mx',
        codeSent: true,
      },
    });

    renderAndSubmit();

    expect(await screen.findByTestId('mfa-mandatory-challenge')).toBeInTheDocument();
    expect(screen.getByText(/que enviamos a ar•••@piic\.com\.mx/)).toBeInTheDocument();
    expect(screen.getByTestId('mfa-email-resend')).toBeInTheDocument();
    expect(screen.getByTestId('mfa-challenge-countdown')).toHaveTextContent('10:00');
  });
});
