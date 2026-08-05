import { alertsCountResponseSchema } from '@mantenimiento/contracts';
import api from './client';

/**
 * FC 094 F4 — typed client for the alerts domain piloted backend-side in F3
 * (routes/alerts.ts → Route→Service→Repository). `GET /alerts` itself is
 * fetched by `useSilkHydration` (its own cache-first engine, out of F4's
 * "1 feature" scope to touch) — `useAlerts.ts` validates that response via
 * its `transform` option instead. This client covers `/alerts/count`, whose
 * consumer (`useAlertsCount.ts`) has no such engine and calls straight
 * through. Validates the real response shape via the shared
 * `packages/contracts` schema (Zod `.parse`, not just a compile-time cast) —
 * a contract drift becomes a thrown error here instead of silently-wrong
 * data downstream.
 */
// eslint-disable-next-line import/prefer-default-export
export async function getAlertsCount(): Promise<number> {
  const res = await api.get('/alerts/count');
  return alertsCountResponseSchema.parse(res.data).count;
}
