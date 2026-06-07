import api from './client';

interface AcceptResult {
  workOrderId: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  workOrderId?: number;
}

export async function acceptMaintenance(uuid: string): Promise<AcceptResult> {
  const res = await api.patch<ApiEnvelope<AcceptResult>>(`/maintenance/${uuid}/accept`);
  const workOrderId = res.data.workOrderId ?? res.data.data?.workOrderId;
  if (workOrderId === undefined) throw new Error('accept response missing workOrderId');
  return { workOrderId };
}

export async function rejectMaintenance(uuid: string): Promise<void> {
  await api.patch(`/maintenance/${uuid}/reject`);
}
