import { useState, useCallback, useEffect } from 'react';
import api from '../api/client';

export interface Contact {
  id: number;
  ownerId: number;
  fullName: string;
  company: string | null;
  roleLabel: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseContactsResult {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useContacts(): UseContactsResult {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ contacts: Contact[] }>('/contacts');
      setContacts(res.data.contacts);
    } catch {
      setError('No se pudo cargar el directorio de contactos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return { contacts, isLoading, error, refresh };
}
