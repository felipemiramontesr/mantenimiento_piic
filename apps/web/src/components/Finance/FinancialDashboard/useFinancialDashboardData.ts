import { useCallback, useEffect, useState } from 'react';
import api from '../../../api/client';
import { DateRange, FinanceDashboardData } from '../../../types/finance';

export interface UseFinancialDashboardDataResult {
  data: FinanceDashboardData | null;
  loading: boolean;
  error: string | null;
}

/** Carga los datos del dashboard financiero cuando cambia el rango de fechas (FC163 F2B3, split). */
export function useFinancialDashboardData(dateRange: DateRange): UseFinancialDashboardDataResult {
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (range: DateRange): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: FinanceDashboardData }>(
        `/finance/dashboard?from=${range.from}&to=${range.to}`
      );
      setData(res.data.data);
    } catch {
      setError('No se pudieron cargar los datos financieros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect((): void => {
    fetchDashboard(dateRange);
  }, [dateRange, fetchDashboard]);

  return { data, loading, error };
}
