import { alertsArraySchema, type Alert } from '@mantenimiento/contracts';
import useSilkHydration from './useSilkHydration';

/**
 * FC 094 F4 — `Alert`/`AlertSeverity`/`AlertType` now come from
 * `packages/contracts` (shared SSOT with `apps/api/src/services/
 * alerts.calculators.ts`, piloted backend-side in F3) instead of a locally
 * hand-duplicated copy. Re-exported so existing consumers (`AlertsPanel.tsx`
 * et al.) keep importing from this module unchanged.
 */
export type { Alert, AlertSeverity, AlertType } from '@mantenimiento/contracts';

interface UseAlertsResult {
  alerts: Alert[];
  isSyncing: boolean;
  refresh: () => Promise<void>;
}

export default function useAlerts(): UseAlertsResult {
  const { data, isSyncing, refresh } = useSilkHydration<Alert>({
    key: 'system_alerts',
    endpoint: '/alerts',
    // Runtime validation against the same schema the backend response is
    // built from — a contract drift throws here instead of rendering
    // silently-wrong alert data.
    transform: (raw) => alertsArraySchema.parse(raw),
  });

  return { alerts: data, isSyncing, refresh };
}
