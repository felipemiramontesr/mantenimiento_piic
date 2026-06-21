import { useState, useEffect } from 'react';
import api from '../api/client';

export type CheckpointStatus = 'PENDING' | 'VISITED' | 'SKIPPED';

export interface Checkpoint {
  id: number;
  movement_id: number;
  sequence: number;
  name: string;
  neighborhood_id: number | null;
  eta: string | null;
  arrived_at: string | null;
  status: CheckpointStatus;
  created_at: string;
}

type UseCheckpointsResult = {
  data: Checkpoint[];
  loading: boolean;
  error: string | null;
};

export function useCheckpoints(uuid: string | null): UseCheckpointsResult {
  const [data, setData] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (uuid) {
      setLoading(true);
      setError(null);
      api
        .get<{ success: boolean; data: Checkpoint[] }>(`/routes/${uuid}/checkpoints`)
        .then((res) => {
          if (!cancelled) setData(res.data.data);
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return (): void => {
      cancelled = true;
    };
  }, [uuid]);

  return { data, loading, error };
}
