import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/testUtils';
import SystemSettingsModule from './SystemSettingsModule';
import usePermissions from '../../hooks/usePermissions';

/**
 * FC170 F1 — System_Settings_Modular_Chassis_And_Sidebar_Integration.
 * Covers Gherkin Scenarios 3 (rol regular con permiso de flota) y 4 (Ω)
 * de `170_FC_System_Settings_Modular_Chassis_And_Sidebar_Integration.md`,
 * más el gate de permiso de Cond.R-170 R3 (tarjeta FMS: mismo criterio que
 * ve Fleet, no a todo JWT) y R2 (Consola Soberana solo `isOmegaStrict()`).
 * Scenario 5 (responsividad 375px) queda cubierto por el gate RWD Playwright
 * permanente (FC074 F5, `e2e/responsive.spec.ts`) — no duplicado aquí.
 * FC173 F1 — el tile de Consola Forense ya no abre un panel local (retirado
 * de esta página, ver `ForensicConsoleModule.test.tsx`); aquí solo se
 * verifica que dispara `navigate()` hacia la nueva ruta dedicada.
 */

vi.mock('../../hooks/usePermissions', () => ({ default: vi.fn() }));

const navigateMock = vi.hoisted(() => vi.fn());
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: vi.fn(() => navigateMock) };
});

const mockPerms = (opts: { fleet?: boolean; omega?: boolean } = {}): void => {
  vi.mocked(usePermissions).mockReturnValue({
    hasPermission: (): boolean => false,
    hasAnyPermission: (): boolean => opts.fleet ?? false,
    isOmnipotent: (): boolean => opts.omega ?? false,
    isOmegaStrict: (): boolean => opts.omega ?? false,
  });
};

describe('SystemSettingsModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SYS-SETTINGS-HEADER-1: tenant -- título fijo y descripción de Universo FMS', () => {
    mockPerms({ fleet: true });
    render(<SystemSettingsModule />);
    expect(screen.getByTestId('layout-title').textContent).toBe('Configuración del Sistema');
    expect(screen.getByTestId('layout-description').textContent).toMatch(/Universo FMS/);
  });

  // FC174 F1 — la descripción refleja SOLO la sección que el actor ve.
  it('SYS-SETTINGS-HEADER-2: Ω -- descripción de Capacidades Soberanas, sin mencionar FMS', () => {
    mockPerms({ omega: true });
    render(<SystemSettingsModule />);
    expect(screen.getByTestId('layout-description').textContent).toMatch(/Soberanas/);
    expect(screen.getByTestId('layout-description').textContent).not.toMatch(/FMS/);
  });

  it('SYS-SETTINGS-ACCESS-1: sin permiso de flota ni Ω ve el fallback "Sin acceso", 0 tarjetas', () => {
    mockPerms({ fleet: false, omega: false });
    render(<SystemSettingsModule />);
    expect(screen.getByText(/sin acceso/i)).toBeInTheDocument();
    expect(screen.queryByTestId('system-settings-fms-card')).toBeNull();
    expect(screen.queryByTestId('system-settings-sovereign-card')).toBeNull();
  });

  it('Scenario 3 — usuario regular con permiso de flota ve FMS, NO ve la Consola Soberana', () => {
    mockPerms({ fleet: true, omega: false });
    render(<SystemSettingsModule />);
    expect(screen.getByTestId('system-settings-fms-card')).toBeInTheDocument();
    expect(screen.queryByTestId('system-settings-sovereign-card')).toBeNull();
  });

  // FC174 F1, Scenario 1 — exclusión mutua ESTRICTA: Ω nunca ve Universo FMS,
  // ni siquiera cuando también trae permiso de flota (Omega real siempre trae '*').
  it('FC174 Scenario 1 — Ω ve ÚNICAMENTE la Consola Soberana, NUNCA Universo FMS (aun con permiso de flota)', () => {
    mockPerms({ fleet: true, omega: true });
    render(<SystemSettingsModule />);
    expect(screen.getByTestId('system-settings-sovereign-card')).toBeInTheDocument();
    expect(screen.queryByTestId('system-settings-fms-card')).toBeNull();
  });

  it('Cond.R-170 R2 — Consola Soberana 0 leak en el DOM cuando isOmegaStrict()===false', () => {
    mockPerms({ fleet: true, omega: false });
    const { container } = render(<SystemSettingsModule />);
    expect(container.innerHTML).not.toMatch(/Consola Soberana/);
  });

  it('Cond.R-170 R3 / FC174 — Ω sin permiso de flota explícito también ve SOLO la Consola Soberana', () => {
    mockPerms({ fleet: false, omega: true });
    render(<SystemSettingsModule />);
    expect(screen.queryByTestId('system-settings-fms-card')).toBeNull();
    expect(screen.getByTestId('system-settings-sovereign-card')).toBeInTheDocument();
  });

  // FC171 F1 — ArchonDoctor_Relocation_To_SovereignConsole, Scenario 3.
  it('FC171 Scenario 3 — Ω ve el disparador de la Consola Forense dentro de la Consola Soberana', () => {
    mockPerms({ fleet: true, omega: true });
    render(<SystemSettingsModule />);
    const trigger = screen.getByTestId('sovereign-console-doctor-trigger');
    expect(trigger).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Consola Forense Archon Doctor/i })
    ).toBeInTheDocument();
  });

  it('FC171 Scenario 3 — un usuario regular (no Ω) NO ve el disparador de la Consola Forense', () => {
    mockPerms({ fleet: true, omega: false });
    render(<SystemSettingsModule />);
    expect(screen.queryByTestId('sovereign-console-doctor-trigger')).toBeNull();
    expect(screen.queryByRole('button', { name: /Consola Forense Archon Doctor/i })).toBeNull();
  });

  // FC172 F1 — System_Settings_App_Launcher_Tiles.
  it('FC172 Scenario 2 — Universo FMS muestra 3 tiles de capacidad, todos "Próximamente"', () => {
    mockPerms({ fleet: true, omega: false });
    render(<SystemSettingsModule />);
    expect(screen.getByTestId('app-tile-preventive-maintenance')).toBeInTheDocument();
    expect(screen.getByTestId('app-tile-fleet-alerts')).toBeInTheDocument();
    expect(screen.getByTestId('app-tile-routes-checkpoints')).toBeInTheDocument();
    expect(screen.getAllByText('Próximamente')).toHaveLength(3);
  });

  // FC174 F1 — Cosmología pasa de coming_soon a active; solo Auditoría queda "Próximamente".
  it('FC174 — Consola Soberana muestra Cosmología activa + 1 tile "Próximamente" (Auditoría)', () => {
    mockPerms({ omega: true });
    render(<SystemSettingsModule />);
    expect(screen.getByTestId('sovereign-console-cosmology-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('app-tile-protocol-audit')).toBeInTheDocument();
    expect(screen.getAllByText('Próximamente')).toHaveLength(1);
  });

  // FC174 F1, Scenario 2.
  it('FC174 Scenario 2 — click en el tile de Cosmología navega a /dashboard/cosmology', () => {
    mockPerms({ omega: true });
    render(<SystemSettingsModule />);

    fireEvent.click(screen.getByTestId('sovereign-console-cosmology-trigger'));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/cosmology');
  });

  // FC173 F1 — Forensic_Console_Full_Page_Module, Scenario 1.
  it('FC173 Scenario 1 — click en el tile de Doctor navega a /dashboard/system-settings/forensics, sin panel superpuesto', () => {
    mockPerms({ fleet: true, omega: true });
    render(<SystemSettingsModule />);

    fireEvent.click(screen.getByTestId('sovereign-console-doctor-trigger'));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/system-settings/forensics');
    expect(screen.queryByText('Forensic Console V4')).not.toBeInTheDocument();
  });
});
