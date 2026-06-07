import { useState, useCallback } from 'react';
import type { UpaWorkOrderDetail, UpaFleetType, UpaDeferredType } from '../types/upa';
import * as upaApi from '../api/upa';

export interface UseUpaOrderReturn {
  workOrder: UpaWorkOrderDetail | null;
  loading: boolean;
  error: string | null;
  initLoading: boolean;
  taskUpdating: Record<string, boolean>;
  closingOrder: boolean;
  startOrder: (vehicleId: string, fleetType: UpaFleetType) => Promise<void>;
  loadOrder: (workOrderId: number) => Promise<void>;
  completeTask: (taskId: string, evidenceUrls?: string[], evidenceNotes?: string) => Promise<void>;
  deferTask: (taskId: string, deferType: UpaDeferredType) => Promise<void>;
  closeCurrentOrder: () => Promise<void>;
  resetOrder: () => void;
}

export function useUpaOrder(): UseUpaOrderReturn {
  const [workOrder, setWorkOrder] = useState<UpaWorkOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(false);
  const [taskUpdating, setTaskUpdating] = useState<Record<string, boolean>>({});
  const [closingOrder, setClosingOrder] = useState(false);

  const loadOrder = useCallback(async (workOrderId: number): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await upaApi.getOrderById(workOrderId);
      setWorkOrder(data);
    } catch {
      setError('Error al cargar la orden de trabajo');
    } finally {
      setLoading(false);
    }
  }, []);

  const startOrder = useCallback(
    async (vehicleId: string, fleetType: UpaFleetType): Promise<void> => {
      setInitLoading(true);
      setError(null);
      try {
        const result = await upaApi.initOrder({ vehicleId, fleetType });
        await loadOrder(result.workOrderId);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setError('Unidad no encontrada. Verifica el ID de la unidad.');
        } else {
          setError('Error al iniciar la orden de trabajo');
        }
      } finally {
        setInitLoading(false);
      }
    },
    [loadOrder]
  );

  const completeTask = useCallback(
    async (taskId: string, evidenceUrls?: string[], evidenceNotes?: string): Promise<void> => {
      if (!workOrder) return;
      setTaskUpdating((prev) => ({ ...prev, [taskId]: true }));
      setError(null);
      try {
        await upaApi.updateTask(workOrder.id, taskId, {
          status: 'completed',
          ...(evidenceUrls?.length ? { evidenceUrls } : {}),
          ...(evidenceNotes ? { evidenceNotes } : {}),
        });
        await loadOrder(workOrder.id);
      } catch {
        setError('Error al completar la tarea');
      } finally {
        setTaskUpdating((prev) => ({ ...prev, [taskId]: false }));
      }
    },
    [workOrder, loadOrder]
  );

  const deferTask = useCallback(
    async (taskId: string, deferType: UpaDeferredType): Promise<void> => {
      if (!workOrder) return;
      setTaskUpdating((prev) => ({ ...prev, [taskId]: true }));
      setError(null);
      try {
        await upaApi.updateTask(workOrder.id, taskId, { status: deferType });
        await loadOrder(workOrder.id);
      } catch {
        setError('Error al diferir la tarea');
      } finally {
        setTaskUpdating((prev) => ({ ...prev, [taskId]: false }));
      }
    },
    [workOrder, loadOrder]
  );

  const closeCurrentOrder = useCallback(async (): Promise<void> => {
    if (!workOrder) return;
    setClosingOrder(true);
    setError(null);
    try {
      await upaApi.closeOrder(workOrder.id);
      await loadOrder(workOrder.id);
    } catch {
      setError('Error al cerrar la orden de trabajo');
    } finally {
      setClosingOrder(false);
    }
  }, [workOrder, loadOrder]);

  const resetOrder = useCallback((): void => {
    setWorkOrder(null);
    setError(null);
    setTaskUpdating({});
  }, []);

  return {
    workOrder,
    loading,
    error,
    initLoading,
    taskUpdating,
    closingOrder,
    startOrder,
    loadOrder,
    completeTask,
    deferTask,
    closeCurrentOrder,
    resetOrder,
  };
}
