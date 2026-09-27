import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router';
import LoginPage from './Login';
import api from '../../api/client';
import { AuthProvider } from '../../context/AuthContext';

/**
 * FC199 F2/F3 — login con el freno progresivo (429) y el reto adaptativo: si la API responde
 * `BOT_CHALLENGE_REQUIRED`/`FAILED`, la página resuelve el reto y reintenta UNA vez con el payload.
 */

vi.mock('../../api/botChallenge', async () => {
  const actual = await vi.importActual<typeof import('../../api/botChallenge')>(
    '../../api/botChallenge'
  );
  return {
    isBotChallengeError: actual.isBotChallengeError,
    obtainBotChallengePayload: async (): Promise<string> => 'payload-resuelto',
  };
});

vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    defaults: { baseURL: 'https://apiv1.piic.com.mx/v1' },
  },
}));

const mockPost = api.post as ReturnType<typeof vi.fn>;

function renderAndSubmit(): void {
  render(
    <AuthProvider>
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    </AuthProvider>
  );
  fireEvent.change(screen.getByPlaceholderText('usuario o correo@empresa.com'), {
    target: { value: 'grayman' },
  });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pw' } });
  fireEvent.submit(screen.getByRole('button', { name: /acceder al sistema/i }));
}

describe('LoginPage — freno y reto anti-bot (FC199)', () => {
  beforeEach(() => {
    localStorage.clear();
    // AuthProvider llama /auth/refresh al montar: sin sesión.
    mockPost.mockRejectedValueOnce(new Error('no session'));
  });

  it('BOT_CHALLENGE_REQUIRED: resuelve el reto y reintenta con altcha_payload', async () => {
    mockPost
      .mockRejectedValueOnce({
        response: { status: 400, data: { error: 'BOT_CHALLENGE_REQUIRED' } },
      })
      .mockRejectedValueOnce({ response: { status: 401, data: { error: 'L4' } } });

    renderAndSubmit();

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        username: 'grayman',
        password: 'pw',
        altcha_payload: 'payload-resuelto',
      })
    );
    expect(await screen.findByText(/Credenciales inválidas/i)).toBeInTheDocument();
  });

  it('si el reintento también se rechaza, muestra el mensaje de verificación (sin bucle)', async () => {
    const rejected = { response: { status: 400, data: { error: 'BOT_CHALLENGE_FAILED' } } };
    mockPost.mockRejectedValueOnce(rejected).mockRejectedValueOnce(rejected);

    renderAndSubmit();

    expect(await screen.findByText(/No pudimos verificar el acceso/i)).toBeInTheDocument();
    const loginCalls = mockPost.mock.calls.filter(([url]) => url === '/auth/login');
    expect(loginCalls).toHaveLength(2);
  });

  it('429 LOGIN_THROTTLED: muestra cuántos segundos esperar', async () => {
    mockPost.mockRejectedValueOnce({
      response: { status: 429, data: { error: 'LOGIN_THROTTLED', retryAfterSeconds: 8 } },
    });

    renderAndSubmit();

    expect(await screen.findByText(/Espere 8 s/i)).toBeInTheDocument();
  });

  it('429 sin segundos: mensaje genérico de espera', async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 429, data: {} } });

    renderAndSubmit();

    expect(await screen.findByText(/Espere un momento/i)).toBeInTheDocument();
  });
});
