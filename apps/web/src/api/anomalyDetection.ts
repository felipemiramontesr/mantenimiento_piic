import { anomalyDetectionResponseSchema, AnomalyDetectionData } from '@mantenimiento/contracts';
import api from './client';

/** FC 142 F1 — typed client for `useAnomalyDetection.ts` (Cond.R-142-H1). */
// eslint-disable-next-line import/prefer-default-export
export async function getAnomalyDetection(unitId: string): Promise<AnomalyDetectionData> {
  const res = await api.get(`/fleet-units/${unitId}/anomalies`);
  return anomalyDetectionResponseSchema.parse(res.data).data;
}
