import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SovereignFooter from './SovereignFooter';
import { SYSTEM_VERSION } from '../../constants/versionConstants';

vi.mock('../../ArchonDoctor', () => ({
  ArchonDoctor: (): React.ReactElement => <div data-testid="archon-doctor-mock" />,
}));

vi.mock('../Logo/ArchonLogo', () => ({
  default: (): React.ReactElement => <div data-testid="archon-logo-mock" />,
}));

describe('SovereignFooter — versión dinámica', () => {
  it('muestra la versión inyectada en build-time, nunca hardcodeada', () => {
    render(<SovereignFooter />);
    expect(
      screen.getByText(`© Copyright ArchonCore by Dreamtek Versión V.${SYSTEM_VERSION}`)
    ).toBeInTheDocument();
  });

  it('no contiene la versión hardcodeada histórica V.78.100.154', () => {
    render(<SovereignFooter />);
    expect(screen.queryByText(/78\.100\.154/)).not.toBeInTheDocument();
  });

  // FC 082 F3c2 (Cond.8 Bravo) — RoleSwitcher ("God Mode", impersonación
  // client-side sobre roles legacy) retirado; el logo se muestra siempre.
  it('muestra el logo siempre, sin distinción de permisos (RoleSwitcher retirado)', () => {
    render(<SovereignFooter />);
    expect(screen.getByTestId('archon-logo-mock')).toBeInTheDocument();
  });

  it('AT-FC074-F2-SF-1: footer tiene padding de safe-area iOS (env(safe-area-inset-bottom))', () => {
    const { container } = render(<SovereignFooter />);
    const footer = container.querySelector('footer') as HTMLElement;
    expect(footer.className).toMatch(/safe-area-inset-bottom/);
  });

  // ── FC 078 F3 (P2-4) — el copyright se truncaba a 360px ("…VERSIÓ") ──
  it('AT-FC078-F3-SF-1: el copyright envuelve <md y el padding del footer es responsivo', () => {
    const { container } = render(<SovereignFooter />);
    const footer = container.querySelector('footer') as HTMLElement;
    expect(footer.className).toContain('px-4');
    expect(footer.className).toContain('md:px-[60px]');
    const copyright = screen.getByText(
      `© Copyright ArchonCore by Dreamtek Versión V.${SYSTEM_VERSION}`
    );
    expect(copyright.className).toContain('whitespace-normal');
    expect(copyright.className).toContain('md:whitespace-nowrap');
    expect(copyright.className).toContain('min-w-0');
  });
});
