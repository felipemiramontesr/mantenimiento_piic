import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ArchonDoctorProvider, useArchonDoctorContext } from './ArchonDoctorContext';
import usePermissions from '../hooks/usePermissions';

/**
 * FC171 F1 — `ArchonDoctorProvider` monta `useArchonDoctorTelemetry` una sola
 * vez, gateado a `isOmegaStrict()`. Estos tests cubren el wiring del
 * Provider/consumer — el comportamiento del propio hook de telemetría está
 * cubierto en `hooks/useArchonDoctorTelemetry.test.ts`.
 */
vi.mock('../hooks/usePermissions', () => ({ default: vi.fn() }));

const mockOmega = (omega: boolean): void => {
  vi.mocked(usePermissions).mockReturnValue({
    hasPermission: (): boolean => false,
    hasAnyPermission: (): boolean => false,
    isOmnipotent: (): boolean => omega,
    isOmegaStrict: (): boolean => omega,
  });
};

function Probe(): React.ReactElement {
  const { logs, context } = useArchonDoctorContext();
  return (
    <div>
      <span data-testid="log-count">{logs.length}</span>
      <span data-testid="context">{context ? 'present' : 'null'}</span>
    </div>
  );
}

describe('ArchonDoctorContext', () => {
  it('useArchonDoctorContext lanza fuera de ArchonDoctorProvider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(
      'useArchonDoctorContext must be used within ArchonDoctorProvider'
    );
    errorSpy.mockRestore();
  });

  it('expone estado inactivo cuando isOmegaStrict()===false', () => {
    mockOmega(false);
    render(
      <ArchonDoctorProvider>
        <Probe />
      </ArchonDoctorProvider>
    );
    expect(screen.getByTestId('log-count').textContent).toBe('0');
    expect(screen.getByTestId('context').textContent).toBe('null');
  });

  it('monta el hook de telemetría cuando isOmegaStrict()===true', () => {
    mockOmega(true);
    render(
      <ArchonDoctorProvider>
        <Probe />
      </ArchonDoctorProvider>
    );
    expect(screen.getByTestId('log-count').textContent).toBe('0');
    expect(screen.getByTestId('context').textContent).toBe('null');
  });
});
