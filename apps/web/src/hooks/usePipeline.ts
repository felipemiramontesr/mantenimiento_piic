import { useState, useCallback, useEffect } from 'react';
import api from '../api/client';

export interface Opportunity {
  id: number;
  ownerId: number;
  stageId: number;
  title: string;
  valueMxn: number;
  probabilityPct: number;
  assignedTo: number | null;
  notes: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: number;
  code: string;
  label: string;
  position: number;
  color: string;
  opportunities: Opportunity[];
}

interface UsePipelineResult {
  stages: PipelineStage[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePipeline(): UsePipelineResult {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ stages: PipelineStage[] }>('/crm/pipeline');
      setStages(res.data.stages);
    } catch {
      setError('No se pudo cargar el pipeline');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return { stages, isLoading, error, refresh };
}
