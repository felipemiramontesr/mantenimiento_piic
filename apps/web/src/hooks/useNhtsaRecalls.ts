import { useState, useCallback } from 'react';
import api from '../api/client';

export type NhtsaRecall = {
  campaignNumber: string;
  subject: string;
  summary: string;
  remedy: string;
  consequence: string;
  component: string;
  manufacturer: string;
  nhtsaActionNumber: string;
};

type ImportParams = {
  campaignNumber: string;
  make: string;
  model: string;
  year: number;
  description?: string;
};

type UseNhtsaRecallsResult = {
  results: NhtsaRecall[];
  loading: boolean;
  error: string | null;
  search(make: string, model: string, year: number): Promise<void>;
  importRecall(params: ImportParams): Promise<{ recall_id: number }>;
};

export function useNhtsaRecalls(): UseNhtsaRecallsResult {
  const [results, setResults] = useState<NhtsaRecall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (make: string, model: string, year: number): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; count: number; data: NhtsaRecall[] }>(
        `/recalls/nhtsa?make=${encodeURIComponent(make)}&model=${encodeURIComponent(
          model
        )}&year=${year}`
      );
      setResults(res.data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al consultar NHTSA');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const importRecall = useCallback(async (params: ImportParams): Promise<{ recall_id: number }> => {
    const res = await api.post<{ success: boolean; recall_id: number; imported: boolean }>(
      '/recalls/nhtsa/import',
      params
    );
    return { recall_id: res.data.recall_id };
  }, []);

  return { results, loading, error, search, importRecall };
}
