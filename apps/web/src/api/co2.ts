import { co2ResponseSchema, Co2Data } from '@mantenimiento/contracts';
import api from './client';

/** FC 142 F1 — typed client for `useCo2.ts` (Cond.R-142-H1). */
// eslint-disable-next-line import/prefer-default-export
export async function getCo2(unitId: string): Promise<Co2Data> {
  const res = await api.get(`/fleet-units/${unitId}/co2`);
  return co2ResponseSchema.parse(res.data).data;
}
