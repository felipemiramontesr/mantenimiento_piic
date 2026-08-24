import { useState, useEffect, type FormEvent } from 'react';
import type { PersonnelRecord, PersonnelFormData } from './types';

const DEFAULT_FORM_DATA: PersonnelFormData = {
  username: '',
  email: '',
  password: '',
  roleId: 3, // Default: Jefe de Mantenimiento de Mina
};

/** Consulta el listado de personal (FC163 F1B-3, split Alfa 219_AN — sub-split de useAccessControlState). */
async function fetchPersonnel(): Promise<PersonnelRecord[]> {
  const response = await fetch(
    `${process.env.VITE_API_URL || 'http://localhost:3001'}/v1/auth/users`,
    { headers: { Authorization: `Bearer ${localStorage.getItem('archon_token')}` } }
  );
  const data = await response.json();
  return data.success ? data.data : [];
}

/** Registra un nuevo miembro de personal (FC163 F1B-3, split Alfa 219_AN — sub-split de useAccessControlState). */
async function registerPersonnel(formData: PersonnelFormData): Promise<void> {
  const response = await fetch(
    `${process.env.VITE_API_URL || 'http://localhost:3001'}/v1/auth/register`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('archon_token')}`,
      },
      body: JSON.stringify(formData),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
}

export interface UseAccessControlStateResult {
  view: 'list' | 'create';
  setView: (v: 'list' | 'create') => void;
  users: PersonnelRecord[];
  formData: PersonnelFormData;
  setFormData: (f: PersonnelFormData) => void;
  isLoading: boolean;
  error: string | null;
  handleRegister: (e: FormEvent) => Promise<void>;
}

/** Estado + acciones del panel de control de acceso (FC163 F1B-3, split Alfa 219_AN). */
export function useAccessControlState(isOpen: boolean): UseAccessControlStateResult {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [users, setUsers] = useState<PersonnelRecord[]>([]);
  const [formData, setFormData] = useState<PersonnelFormData>(DEFAULT_FORM_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async (): Promise<void> => {
    setIsLoading(true);
    try {
      setUsers(await fetchPersonnel());
    } catch {
      // Zero-Noise: Silence error logs in production
    } finally {
      setIsLoading(false);
    }
  };

  useEffect((): void => {
    if (isOpen) loadUsers();
  }, [isOpen]);

  const handleRegister = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await registerPersonnel(formData);
      await loadUsers();
      setView('list');
      setFormData(DEFAULT_FORM_DATA);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de identidad');
    } finally {
      setIsLoading(false);
    }
  };

  return { view, setView, users, formData, setFormData, isLoading, error, handleRegister };
}
