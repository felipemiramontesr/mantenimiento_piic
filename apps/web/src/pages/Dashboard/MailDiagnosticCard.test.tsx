import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import MailDiagnosticCard from './MailDiagnosticCard';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

/**
 * FC188 F2 — tarjeta "Diagnóstico de Correo del Sistema": Scenario 1 (éxito), Scenario 2 (fallo de
 * credenciales) y las demás filas de la T1 (desactivado, sin correo, límite). 0 red: `api` mockeado.
 */

vi.mock('../../api/client', () => ({ default: { post: vi.fn() } }));
// El `AuthProvider` real hace su propio `POST /auth/refresh` al montar y consumiría los valores
// mockeados de `api.post`: se sustituye por un passthrough para que solo cuente la petición de la tarjeta.
vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return {
    ...actual,
    useAuth: vi.fn(),
    AuthProvider: ({ children }: { children: ReactNode }): ReactNode => children,
  };
});

const getSessionEpoch = vi.fn(() => 1);

function mockAuth(email: string | undefined): void {
  vi.mocked(useAuth).mockReturnValue({
    currentUser: email === undefined ? null : { email },
    getSessionEpoch,
  } as unknown as ReturnType<typeof useAuth>);
}

function httpError(status: number, data: unknown): AxiosError {
  const res = {
    status,
    data,
    headers: {},
    statusText: '',
    config: { headers: new AxiosHeaders() },
  };
  return new AxiosError('boom', 'ERR_BAD_REQUEST', undefined, undefined, res as AxiosResponse);
}

const okBody = (overrides: object): { data: object } => ({
  data: { success: true, mode: 'smtp', status: 'sent', ...overrides },
});

const clickSend = (): void => {
  fireEvent.click(screen.getByTestId('mail-diagnostic-send'));
};

describe('FC188 F2 — MailDiagnosticCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionEpoch.mockReturnValue(1);
    mockAuth('felipemiramontesr@gmail.com');
  });

  it('estado inicial: título, destino enmascarado, "sin pruebas" y botón habilitado, sin resultado', () => {
    render(<MailDiagnosticCard />);

    expect(screen.getByText('Diagnóstico de Correo del Sistema')).toBeInTheDocument();
    expect(screen.getByText(/fe•••@gmail\.com/)).toBeInTheDocument();
    expect(screen.queryByText(/felipemiramontesr@gmail\.com/)).toBeNull();
    expect(screen.getByTestId('mail-diagnostic-mode').textContent).toMatch(/sin pruebas/);
    expect(screen.getByTestId('mail-diagnostic-send')).toBeEnabled();
    expect(screen.queryByTestId('mail-diagnostic-outcome')).toBeNull();
  });

  it('Scenario 1 — envía con cuerpo vacío (sin destinatario) y confirma "revisa bandeja y spam"', async () => {
    vi.mocked(api.post).mockResolvedValue(okBody({ messageId: '<m1>' }));
    render(<MailDiagnosticCard />);

    clickSend();

    const outcome = await screen.findByTestId('mail-diagnostic-outcome');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/cosmology/mail/test', {});
    expect(outcome.textContent).toBe(
      'Correo de prueba enviado a fe•••@gmail.com — revisa tu bandeja de entrada y spam'
    );
    expect(outcome).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('mail-diagnostic-mode').textContent).toMatch(/SMTP \(Hostinger\)/);
  });

  it('mientras envía: botón deshabilitado con "Enviando…"; al terminar se rehabilita', async () => {
    let resolve: (value: object) => void = () => undefined;
    vi.mocked(api.post).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }) as never
    );
    render(<MailDiagnosticCard />);

    clickSend();
    expect(await screen.findByText('Enviando…')).toBeInTheDocument();
    expect(screen.getByTestId('mail-diagnostic-send')).toBeDisabled();

    resolve(okBody({}));
    await screen.findByTestId('mail-diagnostic-outcome');
    expect(screen.getByTestId('mail-diagnostic-send')).toBeEnabled();
    expect(screen.getByText('Enviar Correo de Prueba')).toBeInTheDocument();
  });

  it('Scenario 2 — EAUTH: indica corregir usuario/contraseña del buzón (role=alert)', async () => {
    vi.mocked(api.post).mockResolvedValue(okBody({ status: 'failed', reason: 'EAUTH' }));
    render(<MailDiagnosticCard />);

    clickSend();

    const outcome = await screen.findByTestId('mail-diagnostic-outcome');
    expect(outcome.textContent).toMatch(/verifica el usuario y contraseña del buzón en Hostinger/);
    expect(outcome).toHaveAttribute('role', 'alert');
  });

  it('ETIMEDOUT: indica verificar host y puerto SMTP', async () => {
    vi.mocked(api.post).mockResolvedValue(okBody({ status: 'failed', reason: 'ETIMEDOUT' }));
    render(<MailDiagnosticCard />);

    clickSend();

    expect((await screen.findByTestId('mail-diagnostic-outcome')).textContent).toMatch(
      /verifica el host y puerto SMTP/
    );
  });

  it('SMTP_* ausentes: advierte que el correo está desactivado y el transporte lo refleja', async () => {
    vi.mocked(api.post).mockResolvedValue(okBody({ mode: 'disabled', status: 'disabled' }));
    render(<MailDiagnosticCard />);

    clickSend();

    expect((await screen.findByTestId('mail-diagnostic-outcome')).textContent).toMatch(
      /desactivado \(faltan variables SMTP_\* en el panel\)/
    );
    expect(screen.getByTestId('mail-diagnostic-mode').textContent).toMatch(/Desactivado/);
  });

  it('400 EMAIL_NOT_CONFIGURED: la cuenta de Omega no tiene correo', async () => {
    vi.mocked(api.post).mockRejectedValue(httpError(400, { code: 'EMAIL_NOT_CONFIGURED' }));
    render(<MailDiagnosticCard />);

    clickSend();

    expect((await screen.findByTestId('mail-diagnostic-outcome')).textContent).toBe(
      'La cuenta de Omega no tiene un correo configurado para recibir pruebas'
    );
  });

  it('429: avisa del límite de 3/hora (role=status, advertencia) y el botón queda disponible', async () => {
    vi.mocked(api.post).mockRejectedValue(httpError(429, { code: 'RATE_LIMIT_EXCEEDED' }));
    render(<MailDiagnosticCard />);

    clickSend();

    const outcome = await screen.findByTestId('mail-diagnostic-outcome');
    expect(outcome.textContent).toMatch(/3 correos de prueba por hora/);
    expect(outcome).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('mail-diagnostic-send')).toBeEnabled();
  });

  it('un segundo envío limpia el resultado anterior antes de mostrar el nuevo', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce(okBody({ status: 'failed', reason: 'EAUTH' }))
      .mockResolvedValueOnce(okBody({}));
    render(<MailDiagnosticCard />);

    clickSend();
    await screen.findByText(/Fallo de autenticación SMTP/);
    clickSend();

    await waitFor(() =>
      expect(screen.getByTestId('mail-diagnostic-outcome').textContent).toMatch(/enviado a/)
    );
    expect(screen.queryByText(/Fallo de autenticación SMTP/)).toBeNull();
  });

  it('sin correo en la sesión: usa el texto genérico en vez de un correo enmascarado', () => {
    mockAuth(undefined);
    render(<MailDiagnosticCard />);

    expect(screen.getByText(/a tu correo registrado para verificar/)).toBeInTheDocument();
  });

  it('un resultado que llega tras un login/logout (época de sesión distinta) se descarta', async () => {
    let resolve: (value: object) => void = () => undefined;
    vi.mocked(api.post).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }) as never
    );
    render(<MailDiagnosticCard />);

    clickSend();
    await screen.findByText('Enviando…');
    getSessionEpoch.mockReturnValue(2);
    resolve(okBody({}));

    await waitFor(() => expect(screen.getByTestId('mail-diagnostic-send')).toBeEnabled());
    expect(screen.queryByTestId('mail-diagnostic-outcome')).toBeNull();
  });
});
