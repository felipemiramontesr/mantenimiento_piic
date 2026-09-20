import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/testUtils';
import MailDiagnosticModule from './MailDiagnosticModule';
import usePermissions from '../../hooks/usePermissions';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

/**
 * FC190 F1 — Sovereign_Mail_Diagnostic_Tile_And_Dedicated_View. Covers Gherkin Scenarios 1
 * (contenido de la vista dedicada — la navegación en sí se cubre del lado del emisor en
 * `SystemSettingsModule.test.tsx`, mismo split que FC173 usa para Forense/`ForensicConsoleModule`),
 * 2 (guardia no-Ω) y 3 (retorno) de `190_FC_Sovereign_Mail_Diagnostic_Tile_And_Dedicated_View.md`.
 */

vi.mock('../../hooks/usePermissions', () => ({ default: vi.fn() }));

const navigateMock = vi.hoisted(() => vi.fn());
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: vi.fn(() => navigateMock) };
});

vi.mock('../../api/client', () => ({ default: { post: vi.fn() } }));
// El `AuthProvider` real de testUtils hace su propio `POST /auth/refresh` al montar y consumiría
// los valores mockeados de `api.post` (mismo ajuste que `MailDiagnosticCard.test.tsx`).
vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return {
    ...actual,
    useAuth: vi.fn(),
    AuthProvider: ({ children }: { children: ReactNode }): ReactNode => children,
  };
});

const mockOmega = (omega: boolean): void => {
  vi.mocked(usePermissions).mockReturnValue({
    hasPermission: (): boolean => false,
    hasAnyPermission: (): boolean => false,
    isOmnipotent: (): boolean => omega,
    isOmegaStrict: (): boolean => omega,
  });
};

describe('MailDiagnosticModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      currentUser: { email: 'grayman@piic.com.mx' },
      getSessionEpoch: () => 1,
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('Scenario 2 — un usuario no-Ω NO ve la página de diagnóstico (redirect, 0 contenido)', () => {
    mockOmega(false);
    render(<MailDiagnosticModule />);
    expect(screen.queryByTestId('mail-diagnostic-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mail-diagnostic-back-link')).not.toBeInTheDocument();
  });

  it('Scenario 1 — Ω ve la vista dedicada completa: tarjeta de diagnóstico y botón de retorno', () => {
    mockOmega(true);
    render(<MailDiagnosticModule />);
    expect(screen.getByTestId('mail-diagnostic-card')).toBeInTheDocument();
    expect(screen.getByTestId('mail-diagnostic-send')).toBeInTheDocument();
    expect(screen.getByTestId('mail-diagnostic-back-link')).toBeInTheDocument();
  });

  it('fija el header soberano de la sección (título y subtítulo propios de la vista)', () => {
    mockOmega(true);
    render(<MailDiagnosticModule />);
    expect(screen.getByTestId('layout-title').textContent).toBe('Diagnóstico de Correo');
    expect(screen.getByTestId('layout-description').textContent).toBe(
      'Sonda Soberana de Transporte SMTP'
    );
  });

  it('Scenario 3 — el botón de retorno navega a /dashboard/system-settings', () => {
    mockOmega(true);
    render(<MailDiagnosticModule />);
    fireEvent.click(screen.getByTestId('mail-diagnostic-back-link'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/system-settings');
  });

  it('el botón "Enviar Correo de Prueba" sigue funcionando dentro de la vista dedicada', async () => {
    mockOmega(true);
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, mode: 'smtp', status: 'sent', messageId: '<m1>' },
    });
    render(<MailDiagnosticModule />);

    fireEvent.click(screen.getByTestId('mail-diagnostic-send'));

    expect(await screen.findByTestId('mail-diagnostic-outcome')).toHaveTextContent(
      'revisa tu bandeja de entrada y spam'
    );
  });
});
