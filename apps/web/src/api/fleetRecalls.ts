import {
  fleetRecallsResponseSchema,
  recallActionResponseSchema,
  RecallItem,
  RecallStatus,
} from '@mantenimiento/contracts';
import api from './client';

/** FC 142 F1 — typed client for `useFleetRecalls.ts` (Cond.R-142-H1). */
export async function getFleetRecalls(unitId: string): Promise<RecallItem[]> {
  const res = await api.get(`/fleet-units/${unitId}/recalls`);
  return fleetRecallsResponseSchema.parse(res.data).data;
}

/** Links a catalog recall to a fleet unit. */
export async function linkFleetRecall(unitId: string, recallId: number): Promise<void> {
  const res = await api.post(`/fleet-units/${unitId}/recalls`, { recallId });
  recallActionResponseSchema.parse(res.data);
}

/** Updates the status of a recall already linked to a fleet unit. */
export async function updateFleetRecallStatus(
  unitId: string,
  recallId: number,
  status: RecallStatus
): Promise<void> {
  const res = await api.patch(`/fleet-units/${unitId}/recalls/${recallId}`, { status });
  recallActionResponseSchema.parse(res.data);
}
