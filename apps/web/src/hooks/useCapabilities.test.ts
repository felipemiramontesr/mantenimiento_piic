import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '../test/testUtils';
import useCapabilities from './useCapabilities';
import { useAuth } from '../context/AuthContext';

/**
 * FC193 F3 — `useCapabilities` lee `activeCapabilities` del usuario efectivo. Sin el campo (API anterior a
 * F3) no oculta nada; con él, solo lo listado está activo.
 */

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AuthProvider: ({ children }: { children: any }): any => children,
}));

const mockUser = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effectiveUser: any
): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useAuth).mockReturnValue({ effectiveUser } as any);
};

describe('useCapabilities (FC193 F3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('con activeCapabilities: solo los Supercúmulos y Cúmulos listados están activos', () => {
    mockUser({
      activeCapabilities: { superclusters: ['FINANZAS', 'RASTREO'], clusters: ['GASTOS_EGRESOS'] },
    });

    const { result } = renderHook(() => useCapabilities());

    expect(result.current.isSuperclusterActive('FINANZAS')).toBe(true);
    expect(result.current.isSuperclusterActive('RASTREO')).toBe(true);
    expect(result.current.isSuperclusterActive('MANTENIMIENTO')).toBe(false);
    expect(result.current.isSuperclusterActive('CRM')).toBe(false);
    expect(result.current.isClusterActive('GASTOS_EGRESOS')).toBe(true);
  });

  it('un universo sin nada activo (Arc itinerante) ⇒ todo inactivo, incluido el cluster', () => {
    mockUser({ activeCapabilities: { superclusters: [], clusters: [] } });

    const { result } = renderHook(() => useCapabilities());

    expect(result.current.isSuperclusterActive('RASTREO')).toBe(false);
    expect(result.current.isClusterActive('GASTOS_EGRESOS')).toBe(false);
  });

  it('payload SIN activeCapabilities (API anterior a F3) ⇒ no oculta nada', () => {
    mockUser({ username: 'legacy' });

    const { result } = renderHook(() => useCapabilities());

    expect(result.current.isSuperclusterActive('MANTENIMIENTO')).toBe(true);
    expect(result.current.isClusterActive('GASTOS_EGRESOS')).toBe(true);
  });

  it('sin usuario efectivo (null) ⇒ tampoco oculta: estos guards solo se montan con sesión', () => {
    mockUser(null);

    const { result } = renderHook(() => useCapabilities());

    expect(result.current.isSuperclusterActive('RASTREO')).toBe(true);
  });
});
