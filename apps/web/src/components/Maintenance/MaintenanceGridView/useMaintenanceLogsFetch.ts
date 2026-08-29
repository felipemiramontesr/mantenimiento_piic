import { useEffect, useState } from 'react';
import { MaintenanceLog } from '../../../types/maintenance';
import api from '../../../api/client';

/** Fetch de registros de mantenimiento, saneado en la frontera (FC165 F2 Slice 2.1B). */
export function useMaintenanceLogsFetch(refreshTrigger: number): {
  logs: MaintenanceLog[];
  loading: boolean;
  error: string | null;
} {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await api.get('/maintenance?limit=50');
        if (response.data.success) {
          // Boundary Sanitization (FC165 F2 Slice 2.1B finding): a non-array
          // response.data.data (e.g. a malformed `data: null`) used to crash
          // the sort/filter memo's array spread on the next render.
          setLogs(Array.isArray(response.data.data) ? response.data.data : []);
        }
      } catch {
        setError('Error al recuperar registros de mantenimiento.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [refreshTrigger]);

  return { logs, loading, error };
}

export default useMaintenanceLogsFetch;
