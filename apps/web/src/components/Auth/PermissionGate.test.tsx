import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PermissionGate from './PermissionGate';
import usePermissions from '../../hooks/usePermissions';

vi.mock('../../hooks/usePermissions', () => ({ default: vi.fn() }));

const mockHasPermission = (allowed: boolean): void => {
  vi.mocked(usePermissions).mockReturnValue({
    hasPermission: (): boolean => allowed,
    hasAnyPermission: (): boolean => allowed,
    isOmnipotent: (): boolean => false,
    isExternalClientOnly: (): boolean => false,
    isSuiteVIM: (): boolean => false,
    isFamiliar: (): boolean => false,
  });
};

describe('FC-18 FaseD-4 — PermissionGate (AT-FC18-D4-PG)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('AT-FC18-D4-PG-1 — renders children when user has required permission', () => {
    mockHasPermission(true);
    render(
      <PermissionGate permission="fleet:unit:view:any">
        <span>Contenido protegido</span>
      </PermissionGate>
    );
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });

  it('AT-FC18-D4-PG-2 — renders fallback when user lacks required permission', () => {
    mockHasPermission(false);
    render(
      <PermissionGate permission="fleet:unit:view:any" fallback={<span>Sin acceso</span>}>
        <span>Contenido protegido</span>
      </PermissionGate>
    );
    expect(screen.queryByText('Contenido protegido')).toBeNull();
    expect(screen.getByText('Sin acceso')).toBeInTheDocument();
  });

  it('AT-FC18-D4-PG-3 — renders null by default when permission is denied and no fallback', () => {
    mockHasPermission(false);
    const { container } = render(
      <PermissionGate permission="intelligence:anomaly:view">
        <span>Anomalías</span>
      </PermissionGate>
    );
    expect(screen.queryByText('Anomalías')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('AT-FC18-D4-PG-4 — passes the correct permission slug to hasPermission', () => {
    const hasPermissionSpy = vi.fn().mockReturnValue(true);
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: hasPermissionSpy,
      hasAnyPermission: (): boolean => true,
      isOmnipotent: (): boolean => false,
      isExternalClientOnly: (): boolean => false,
      isSuiteVIM: (): boolean => false,
      isFamiliar: (): boolean => false,
    });
    render(
      <PermissionGate permission="security:audit:view">
        <span>Logs</span>
      </PermissionGate>
    );
    expect(hasPermissionSpy).toHaveBeenCalledWith('security:audit:view');
  });
});
