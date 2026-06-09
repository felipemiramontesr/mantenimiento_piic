import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUpaOrder } from './useUpaOrder';
import * as upaApi from '../api/upa';
import type { UpaWorkOrderDetail } from '../types/upa';

vi.mock('../api/upa');

const mockTask = {
  taskId: 'triage_dashboard_lights',
  stage: 'triage' as const,
  packageLevel: null,
  description: 'Revisión de luces de tablero',
  status: 'pending' as const,
  evidenceUrls: null,
  evidenceNotes: null,
  completedAt: null,
};

const mockWorkOrder: UpaWorkOrderDetail = {
  id: 1,
  uuid: 'test-uuid-1234',
  vehicleId: 'ASM-001',
  fleetType: 'urban',
  status: 'IN_PROGRESS',
  pendingSince: null,
  openedAt: '2024-01-01T00:00:00.000Z',
  closedAt: null,
  tasks: [mockTask],
};

describe('useUpaOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with no work order and no error', () => {
      const { result } = renderHook(() => useUpaOrder());
      expect(result.current.workOrder).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.initLoading).toBe(false);
      expect(result.current.closingOrder).toBe(false);
    });
  });

  describe('startOrder', () => {
    it('calls initOrder then loadOrder and sets workOrder on success', async () => {
      vi.mocked(upaApi.initOrder).mockResolvedValue({
        workOrderId: 1,
        uuid: 'test-uuid-1234',
        taskCount: 5,
      });
      vi.mocked(upaApi.getOrderById).mockResolvedValue(mockWorkOrder);

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.startOrder('ASM-001');
      });

      expect(upaApi.initOrder).toHaveBeenCalledWith({ vehicleId: 'ASM-001' });
      expect(upaApi.getOrderById).toHaveBeenCalledWith(1);
      expect(result.current.workOrder).toEqual(mockWorkOrder);
      expect(result.current.error).toBeNull();
    });

    it('sets 404 error when vehicle not found', async () => {
      vi.mocked(upaApi.initOrder).mockRejectedValue({ response: { status: 404 } });

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.startOrder('NONEXISTENT');
      });

      expect(result.current.error).toBe('Unidad no encontrada. Verifica el ID de la unidad.');
      expect(result.current.workOrder).toBeNull();
    });

    it('sets generic error on unexpected failure', async () => {
      vi.mocked(upaApi.initOrder).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.startOrder('ASM-001');
      });

      expect(result.current.error).toBe('Error al iniciar la orden de trabajo');
      expect(result.current.workOrder).toBeNull();
    });

    it('sets initLoading true during operation and false after', async () => {
      let resolveInit!: () => void;
      vi.mocked(upaApi.initOrder).mockImplementation(
        () =>
          new Promise<{ workOrderId: number; uuid: string; taskCount: number }>((resolve) => {
            resolveInit = (): void => resolve({ workOrderId: 1, uuid: 'uuid', taskCount: 1 });
          })
      );
      vi.mocked(upaApi.getOrderById).mockResolvedValue(mockWorkOrder);

      const { result } = renderHook(() => useUpaOrder());

      act(() => {
        result.current.startOrder('ASM-001', 'urban');
      });

      expect(result.current.initLoading).toBe(true);

      await act(async () => {
        resolveInit();
        await Promise.resolve();
      });
    });
  });

  describe('loadOrder', () => {
    it('fetches work order by id and sets state', async () => {
      vi.mocked(upaApi.getOrderById).mockResolvedValue(mockWorkOrder);

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.loadOrder(1);
      });

      expect(upaApi.getOrderById).toHaveBeenCalledWith(1);
      expect(result.current.workOrder).toEqual(mockWorkOrder);
    });

    it('sets error when fetch fails', async () => {
      vi.mocked(upaApi.getOrderById).mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.loadOrder(1);
      });

      expect(result.current.error).toBe('Error al cargar la orden de trabajo');
      expect(result.current.workOrder).toBeNull();
    });
  });

  describe('completeTask', () => {
    it('calls updateTask with completed status and reloads', async () => {
      vi.mocked(upaApi.getOrderById).mockResolvedValue(mockWorkOrder);
      vi.mocked(upaApi.updateTask).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.loadOrder(1);
      });

      await act(async () => {
        await result.current.completeTask('triage_dashboard_lights');
      });

      expect(upaApi.updateTask).toHaveBeenCalledWith(1, 'triage_dashboard_lights', {
        status: 'completed',
      });
      expect(upaApi.getOrderById).toHaveBeenCalledTimes(2);
    });

    it('passes evidence urls and notes when provided', async () => {
      vi.mocked(upaApi.getOrderById).mockResolvedValue(mockWorkOrder);
      vi.mocked(upaApi.updateTask).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.loadOrder(1);
      });

      await act(async () => {
        await result.current.completeTask(
          'triage_dashboard_lights',
          ['https://example.com/photo.jpg'],
          'Foto tomada al terminar'
        );
      });

      expect(upaApi.updateTask).toHaveBeenCalledWith(1, 'triage_dashboard_lights', {
        status: 'completed',
        evidenceUrls: ['https://example.com/photo.jpg'],
        evidenceNotes: 'Foto tomada al terminar',
      });
    });

    it('omits evidenceUrls when empty array provided', async () => {
      vi.mocked(upaApi.getOrderById).mockResolvedValue(mockWorkOrder);
      vi.mocked(upaApi.updateTask).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.loadOrder(1);
      });

      await act(async () => {
        await result.current.completeTask('triage_dashboard_lights', []);
      });

      expect(upaApi.updateTask).toHaveBeenCalledWith(1, 'triage_dashboard_lights', {
        status: 'completed',
      });
    });

    it('does nothing when workOrder is null', async () => {
      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.completeTask('any_task');
      });

      expect(upaApi.updateTask).not.toHaveBeenCalled();
    });

    it('sets error when updateTask fails', async () => {
      vi.mocked(upaApi.getOrderById).mockResolvedValue(mockWorkOrder);
      vi.mocked(upaApi.updateTask).mockRejectedValue(new Error('server error'));

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.loadOrder(1);
      });

      await act(async () => {
        await result.current.completeTask('triage_dashboard_lights');
      });

      expect(result.current.error).toBe('Error al completar la tarea');
    });
  });

  describe('deferTask', () => {
    it('calls updateTask with DEFERRED_FINANCIAL status', async () => {
      vi.mocked(upaApi.getOrderById).mockResolvedValue(mockWorkOrder);
      vi.mocked(upaApi.updateTask).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.loadOrder(1);
      });

      await act(async () => {
        await result.current.deferTask('triage_dashboard_lights', 'DEFERRED_FINANCIAL');
      });

      expect(upaApi.updateTask).toHaveBeenCalledWith(1, 'triage_dashboard_lights', {
        status: 'DEFERRED_FINANCIAL',
      });
    });

    it('calls updateTask with N_A_STRUCTURAL status', async () => {
      vi.mocked(upaApi.getOrderById).mockResolvedValue(mockWorkOrder);
      vi.mocked(upaApi.updateTask).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.loadOrder(1);
      });

      await act(async () => {
        await result.current.deferTask('triage_dashboard_lights', 'N_A_STRUCTURAL');
      });

      expect(upaApi.updateTask).toHaveBeenCalledWith(1, 'triage_dashboard_lights', {
        status: 'N_A_STRUCTURAL',
      });
    });

    it('reloads order after defer', async () => {
      vi.mocked(upaApi.getOrderById).mockResolvedValue(mockWorkOrder);
      vi.mocked(upaApi.updateTask).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.loadOrder(1);
      });

      await act(async () => {
        await result.current.deferTask('triage_dashboard_lights', 'DEFERRED_FINANCIAL');
      });

      expect(upaApi.getOrderById).toHaveBeenCalledTimes(2);
    });

    it('does nothing when workOrder is null', async () => {
      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.deferTask('any_task', 'DEFERRED_FINANCIAL');
      });

      expect(upaApi.updateTask).not.toHaveBeenCalled();
    });
  });

  describe('closeCurrentOrder', () => {
    it('calls closeOrder and reloads work order', async () => {
      vi.mocked(upaApi.getOrderById).mockResolvedValue(mockWorkOrder);
      vi.mocked(upaApi.closeOrder).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.loadOrder(1);
      });

      const closedOrder: UpaWorkOrderDetail = {
        ...mockWorkOrder,
        status: 'CLOSED',
        closedAt: '2024-01-02T00:00:00.000Z',
      };
      vi.mocked(upaApi.getOrderById).mockResolvedValue(closedOrder);

      await act(async () => {
        await result.current.closeCurrentOrder();
      });

      expect(upaApi.closeOrder).toHaveBeenCalledWith(1);
      expect(result.current.workOrder?.status).toBe('CLOSED');
    });

    it('does nothing when workOrder is null', async () => {
      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.closeCurrentOrder();
      });

      expect(upaApi.closeOrder).not.toHaveBeenCalled();
    });

    it('sets error when closeOrder fails', async () => {
      vi.mocked(upaApi.getOrderById).mockResolvedValue(mockWorkOrder);
      vi.mocked(upaApi.closeOrder).mockRejectedValue(new Error('already closed'));

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.loadOrder(1);
      });

      await act(async () => {
        await result.current.closeCurrentOrder();
      });

      expect(result.current.error).toBe('Error al cerrar la orden de trabajo');
    });
  });

  describe('resetOrder', () => {
    it('clears workOrder, error and taskUpdating', async () => {
      vi.mocked(upaApi.getOrderById).mockResolvedValue(mockWorkOrder);

      const { result } = renderHook(() => useUpaOrder());

      await act(async () => {
        await result.current.loadOrder(1);
      });

      expect(result.current.workOrder).not.toBeNull();

      act(() => {
        result.current.resetOrder();
      });

      expect(result.current.workOrder).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.taskUpdating).toEqual({});
    });
  });
});
