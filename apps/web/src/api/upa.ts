import api from './client';
import type {
  UpaInitPayload,
  UpaInitResult,
  UpaWorkOrderDetail,
  UpaUpdateTaskPayload,
} from '../types/upa';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function initOrder(payload: UpaInitPayload): Promise<UpaInitResult> {
  const res = await api.post<ApiEnvelope<UpaInitResult>>('/work-orders/init', payload);
  return res.data.data;
}

export async function getOrderById(workOrderId: number): Promise<UpaWorkOrderDetail> {
  const res = await api.get<ApiEnvelope<UpaWorkOrderDetail>>(`/work-orders/${workOrderId}`);
  return res.data.data;
}

export async function updateTask(
  workOrderId: number,
  taskId: string,
  payload: UpaUpdateTaskPayload
): Promise<void> {
  await api.patch(`/work-orders/${workOrderId}/tasks/${taskId}`, payload);
}

export async function closeOrder(workOrderId: number): Promise<void> {
  await api.post(`/work-orders/${workOrderId}/close`);
}
