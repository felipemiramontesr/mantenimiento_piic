import useSilkHydration from './useSilkHydration';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertType =
  | 'MAINTENANCE_OVERDUE'
  | 'INCIDENT_OPEN'
  | 'UNIT_CRITICAL'
  | 'COMPLIANCE_EXPIRY';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  unitId: string;
  createdAt: string;
}

interface UseAlertsResult {
  alerts: Alert[];
  isSyncing: boolean;
  refresh: () => Promise<void>;
}

export default function useAlerts(): UseAlertsResult {
  const { data, isSyncing, refresh } = useSilkHydration<Alert>({
    key: 'system_alerts',
    endpoint: '/alerts',
  });

  return { alerts: data, isSyncing, refresh };
}
