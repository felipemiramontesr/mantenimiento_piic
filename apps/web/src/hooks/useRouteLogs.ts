import { Dispatch, SetStateAction } from 'react';
import useSilkHydration from './useSilkHydration';
import { RouteLog } from '../components/Routes/RouteLogTable';

interface useRouteLogsResult {
  logs: RouteLog[];
  setLogs: Dispatch<SetStateAction<RouteLog[]>>;
  isSyncing: boolean;
  refresh: () => Promise<void>;
}

/**
 * 🔱 ARCHON ROUTE LOGS HOOK
 * Architecture: SOLID - Single Responsibility Logic Layer
 * Purpose: Specialized state and sync management for the Dispatch Log.
 */
export default function useRouteLogs(): useRouteLogsResult {
  const {
    data: logs,
    isSyncing,
    refresh,
    setData: setLogs,
  } = useSilkHydration<RouteLog>({
    key: 'route_logs',
    endpoint: '/routes',
  });

  return {
    logs,
    setLogs,
    isSyncing,
    refresh,
  };
}
