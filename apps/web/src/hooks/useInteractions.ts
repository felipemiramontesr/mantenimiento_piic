import { useState, useCallback, useEffect } from 'react';
import api from '../api/client';

export type InteractionType = 'CALL' | 'EMAIL' | 'NOTE' | 'MEETING';

export interface Interaction {
  id: number;
  ownerId: number;
  contactId: number | null;
  type: InteractionType;
  summary: string;
  createdBy: number;
  createdAt: string;
}

interface UseInteractionsResult {
  interactions: Interaction[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useInteractions(): UseInteractionsResult {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ interactions: Interaction[] }>('/crm/interactions');
      setInteractions(res.data.interactions);
    } catch {
      setError('No se pudo cargar la bitácora');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return { interactions, isLoading, error, refresh };
}
