import { useState, useCallback } from 'react';
import api from '../api/client';

export type CampaignType = 'CONTRACT_EXPIRY' | 'MAINTENANCE_REMINDER' | 'QUOTATION';

export interface Campaign {
  id: number;
  ownerId: number;
  name: string;
  subject: string;
  bodyText: string;
  type: CampaignType;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignPayload {
  ownerId: number;
  name: string;
  subject: string;
  bodyText: string;
  type: CampaignType;
}

interface UseCampaignsResult {
  campaigns: Campaign[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  sendCampaign: (id: number) => Promise<void>;
}

export function useCampaigns(): UseCampaignsResult {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ campaigns: Campaign[] }>('/crm/campaigns');
      setCampaigns(res.data.campaigns);
    } catch {
      setError('No se pudieron cargar las campañas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendCampaign = useCallback(async (id: number): Promise<void> => {
    await api.post(`/crm/campaigns/${id}/send`);
  }, []);

  return { campaigns, isLoading, error, refresh, sendCampaign };
}
