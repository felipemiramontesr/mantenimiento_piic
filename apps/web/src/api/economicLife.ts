import { economicLifeResponseSchema, EconomicLifeData } from '@mantenimiento/contracts';
import api from './client';

/** FC 142 F1 — typed client for `useEconomicLife.ts` (Cond.R-142-H1). */
// eslint-disable-next-line import/prefer-default-export
export async function getEconomicLife(unitId: string): Promise<EconomicLifeData> {
  const res = await api.get(`/fleet-units/${unitId}/economic-life`);
  return economicLifeResponseSchema.parse(res.data).data;
}
