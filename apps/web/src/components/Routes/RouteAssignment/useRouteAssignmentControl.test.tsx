import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactNode, ReactElement, FormEvent } from 'react';
import useRouteAssignmentControl from './useRouteAssignmentControl';
import { UserProvider } from '../../../context/UserContext';
import { FleetProvider } from '../../../context/FleetContext';
import api from '../../../api/client';
import { RouteLog } from '../RouteLogTable';

// 🔱 Mock Infrastructure
vi.mock('../../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
  <UserProvider>
    <FleetProvider>{children}</FleetProvider>
  </UserProvider>
);

describe('useRouteAssignmentControl (Mission Logic Hub)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: [] } });
      if (url === '/auth/users') return Promise.resolve({ data: { success: true, data: [] } });
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: [] } });
      if (url === '/catalogs/ROUTE_ORIGIN')
        return Promise.resolve({ data: { success: true, data: [{ id: 1, label: 'Base' }] } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  it('initializes with default sovereign state', () => {
    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn()), { wrapper });

    expect(result.current.formData.fuelLevel).toBe(100);
    expect(result.current.isEdit).toBe(false);
    expect(result.current.submitting).toBe(false);
  });

  it('hydrates form data when routeToEdit is provided', () => {
    const mockRoute = {
      uuid: 'route-123',
      unit_id: 'ASM-001',
      operator_id: 1,
      destination: 'Mina',
      fuelLevel: 85,
    } as unknown as RouteLog;

    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn(), mockRoute), { wrapper });

    expect(result.current.formData.unitId).toBe('ASM-001');
    expect(result.current.formData.destination).toBe('Mina');
    expect(result.current.formData.fuelLevel).toBe(85);
    expect(result.current.isEdit).toBe(true);
  });

  it('updates form state correctly via updateForm action', () => {
    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn()), { wrapper });

    act(() => {
      result.current.updateForm({ destination: 'Planta de Beneficio' });
    });

    expect(result.current.formData.destination).toBe('Planta de Beneficio');
  });

  it('handles mission start protocol (handleSubmit)', async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useRouteAssignmentControl(onClose), { wrapper });

    // Mock API for starting route
    vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true } });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as FormEvent);
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('triggers audit protocol for deletions', () => {
    const { result } = renderHook(
      () => useRouteAssignmentControl(vi.fn(), { id: 'R-001' } as unknown as RouteLog),
      { wrapper }
    );

    act(() => {
      result.current.triggerAuditDelete();
    });

    expect(result.current.isAuditModalOpen).toBe(true);
    expect(result.current.auditAction).toBe('DELETE');
  });

  it('executes audit confirmation for updates', async () => {
    const onClose = vi.fn();
    const mockRoute = { uuid: 'u-1', id: 'R-1' } as unknown as RouteLog;
    const { result } = renderHook(() => useRouteAssignmentControl(onClose, mockRoute), { wrapper });

    vi.mocked(api.put).mockResolvedValueOnce({ data: { success: true } });

    await act(async () => {
      await result.current.handleConfirmAudit('Rectificación de destino');
    });

    expect(api.put).toHaveBeenCalledWith(
      '/routes/u-1',
      expect.objectContaining({
        reason: 'Rectificación de destino',
      })
    );
    expect(onClose).toHaveBeenCalled();
  });
});
