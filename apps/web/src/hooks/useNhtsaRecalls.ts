import { useState, useCallback } from 'react';
import { searchNhtsaRecalls, importNhtsaRecall } from '../api/nhtsaRecalls';

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
      const data = await searchNhtsaRecalls(make, model, year);
      setResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al consultar NHTSA');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const importRecall = useCallback(
    (params: ImportParams): Promise<{ recall_id: number }> => importNhtsaRecall(params),
    []
  );

  return { results, loading, error, search, importRecall };
}
