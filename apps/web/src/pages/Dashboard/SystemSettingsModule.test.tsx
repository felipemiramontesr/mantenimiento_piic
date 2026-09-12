import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as testRender, screen } from '../../test/testUtils';
import SystemSettingsModule from './SystemSettingsModule';
import usePermissions from '../../hooks/usePermissions';
import { ArchonDoctorProvider } from '../../context/ArchonDoctorContext';

/**
 * FC170 F1 — System_Settings_Modular_Chassis_And_Sidebar_Integration.
 * Covers Gherkin Scenarios 3 (rol regular con permiso de flota) y 4 (Ω)
 * de `170_FC_System_Settings_Modular_Chassis_And_Sidebar_Integration.md`,
 * más el gate de permiso de Cond.R-170 R3 (tarjeta FMS: mismo criterio que
 * ve Fleet, no a todo JWT) y R2 (Consola Soberana solo `isOmegaStrict()`).
 * Scenario 5 (responsividad 375px) queda cubierto por el gate RWD Playwright
 * permanente (FC074 F5, `e2e/responsive.spec.ts`) — no duplicado aquí.
 */

vi.mock('../../hooks/usePermissions', () => ({ default: vi.fn() }));

const mockPerms = (opts: { fleet?: boolean; omega?: boolean } = {}): void => {
  vi.mocked(usePermissions).mockReturnValue({
    hasPermission: (): boolean => false,
    hasAnyPermission: (): boolean => opts.fleet ?? false,
    isOmnipotent: (): boolean => opts.omega ?? false,
    isOmegaStrict: (): boolean => opts.omega ?? false,
  });
};

// FC171 F1 — `SovereignConsoleCard` ahora monta `<ArchonDoctor/>`, que lee de
// `ArchonDoctorContext`; el `render` de `testUtils` no lo incluye (deliberado
// — no todos los tests de esta suite mockean `isOmegaStrict`), así que esta
// suite lo envuelve localmente.
const render = (ui: React.ReactElement): ReturnType<typeof testRender> =>
  testRender(<ArchonDoctorProvider>{ui}</ArchonDoctorProvider>);

describe('SystemSettingsModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SYS-SETTINGS-HEADER-1: fija título y descripción de sección', () => {
    mockPerms({ fleet: true });
    render(<SystemSettingsModule />);
    expect(screen.getByTestId('layout-title').textContent).toBe('Configuración del Sistema');
    expect(screen.getByTestId('layout-description').textContent).toMatch(/Universo FMS/);
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

  it('Scenario 4 — Ω ve la sección de Universo FMS y la sección Soberana de Plataforma', () => {
    mockPerms({ fleet: true, omega: true });
    render(<SystemSettingsModule />);
    expect(screen.getByTestId('system-settings-fms-card')).toBeInTheDocument();
    expect(screen.getByTestId('system-settings-sovereign-card')).toBeInTheDocument();
  });

  it('Cond.R-170 R2 — Consola Soberana 0 leak en el DOM cuando isOmegaStrict()===false', () => {
    mockPerms({ fleet: true, omega: false });
    const { container } = render(<SystemSettingsModule />);
    expect(container.innerHTML).not.toMatch(/Consola Soberana/);
  });

  it('Cond.R-170 R3 — la tarjeta FMS depende del permiso de flota, no de isOmegaStrict() por sí solo', () => {
    // Combinación artificial (un Ω real siempre trae '*' → hasAnyPermission true):
    // prueba de wiring del gate, no un escenario realista de producción.
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
    expect(screen.getByRole('button', { name: /ARCHON DOCTOR/i })).toBeInTheDocument();
  });

  it('FC171 Scenario 3 — un usuario regular (no Ω) NO ve el disparador de la Consola Forense', () => {
    mockPerms({ fleet: true, omega: false });
    render(<SystemSettingsModule />);
    expect(screen.queryByTestId('sovereign-console-doctor-trigger')).toBeNull();
    expect(screen.queryByRole('button', { name: /ARCHON DOCTOR/i })).toBeNull();
  });
});
