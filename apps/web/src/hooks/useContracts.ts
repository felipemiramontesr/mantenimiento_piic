import { useState, useCallback, useEffect } from 'react';
import api from '../api/client';

export interface Contract {
  id: number;
  ownerId: number;
  unitId: string | null;
  title: string;
  startDate: string;
  endDate: string;
  slaHours: number;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  notes: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface UseContractsResult {
  contracts: Contract[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useContracts(): UseContractsResult {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ contracts: Contract[] }>('/crm/contracts');
      setContracts(res.data.contracts);
    } catch {
      setError('No se pudo cargar los contratos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return { contracts, isLoading, error, refresh };
}
