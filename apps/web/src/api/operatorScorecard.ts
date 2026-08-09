import { operatorScorecardResponseSchema, OperatorScorecardData } from '@mantenimiento/contracts';
import api from './client';

/** FC 142 F1 — typed client for `useOperatorScorecard.ts` (Cond.R-142-H1). */
// eslint-disable-next-line import/prefer-default-export
export async function getOperatorScorecard(unitId: string): Promise<OperatorScorecardData> {
  const res = await api.get(`/fleet-units/${unitId}/operator-score`);
  return operatorScorecardResponseSchema.parse(res.data).data;
}
