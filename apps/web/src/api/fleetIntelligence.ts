import { fleetIntelligenceResponseSchema, FleetIntelligenceData } from '@mantenimiento/contracts';
import api from './client';

/** FC 142 F1 — typed client for `useFleetIntelligence.ts` (Cond.R-142-H1). */
// eslint-disable-next-line import/prefer-default-export
export async function getFleetIntelligence(unitId: string): Promise<FleetIntelligenceData> {
  const res = await api.get(`/fleet-units/${unitId}/intelligence`);
  return fleetIntelligenceResponseSchema.parse(res.data).data;
}
