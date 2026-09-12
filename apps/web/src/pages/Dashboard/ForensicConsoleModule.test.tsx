import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as testRender, screen, fireEvent } from '../../test/testUtils';
import ForensicConsoleModule from './ForensicConsoleModule';
import usePermissions from '../../hooks/usePermissions';
import { ArchonDoctorProvider } from '../../context/ArchonDoctorContext';

/**
 * FC173 F1 — Forensic_Console_Full_Page_Module.
 * Covers Gherkin Scenarios 1 (navegación desde tile, cubierto del lado del
 * emisor en `SystemSettingsModule.test.tsx`), 2 (tabs), 3 (guardia no-Ω) y
 * 4 (retorno a System Settings) de
 * `173_FC_Forensic_Console_Full_Page_Module.md`.
 */

vi.mock('../../hooks/usePermissions', () => ({ default: vi.fn() }));

const navigateMock = vi.hoisted(() => vi.fn());
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: vi.fn(() => navigateMock) };
});

const mockOmega = (omega: boolean): void => {
  vi.mocked(usePermissions).mockReturnValue({
    hasPermission: (): boolean => false,
    hasAnyPermission: (): boolean => false,
    isOmnipotent: (): boolean => omega,
    isOmegaStrict: (): boolean => omega,
  });
};

const render = (ui: React.ReactElement): ReturnType<typeof testRender> =>
  testRender(<ArchonDoctorProvider>{ui}</ArchonDoctorProvider>);

describe('ForensicConsoleModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario 3 — un usuario no-Ω NO ve la página forense (redirect, 0 contenido)', () => {
    mockOmega(false);
    render(<ForensicConsoleModule />);
    expect(screen.queryByText('Forensic Console V4')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forensics-back-link')).not.toBeInTheDocument();
  });

  it('Ω ve la página forense completa, sin el dock flotante (0 position fixed)', () => {
    mockOmega(true);
    const { container } = render(<ForensicConsoleModule />);
    expect(screen.getByText('Forensic Console V4')).toBeInTheDocument();
    expect(container.querySelector('.fixed')).toBeNull();
  });

  it('Scenario 2 — expone las 4 pestañas canónicas y alterna entre ellas', () => {
    mockOmega(true);
    render(<ForensicConsoleModule />);
    expect(screen.getByText('Red / Conexión')).toBeInTheDocument();
    expect(screen.getByText('Datos Flota')).toBeInTheDocument();
    expect(screen.getByText('Errores y Logs')).toBeInTheDocument();
    expect(screen.getByText('Memoria y Caché')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Datos Flota'));
    expect(screen.getByText('Valid Units')).toBeInTheDocument();
  });

  it('Scenario 4 — el botón de retorno navega a /dashboard/system-settings', () => {
    mockOmega(true);
    render(<ForensicConsoleModule />);
    fireEvent.click(screen.getByTestId('forensics-back-link'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/system-settings');
  });

  it('Scenario 4 — el botón ✕ del panel también navega a /dashboard/system-settings', () => {
    mockOmega(true);
    render(<ForensicConsoleModule />);
    fireEvent.click(screen.getByText('✕'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/system-settings');
  });
});
