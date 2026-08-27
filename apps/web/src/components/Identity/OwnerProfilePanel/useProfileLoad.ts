import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import api from '../../../api/client';
import { AddressValue, EMPTY_ADDRESS } from '../../Common/ArchonAddressField';
import { EMPTY_FORM, ProfileApiData, ProfileForm, hydrateAddress } from './types';

export interface UseProfileLoadResult {
  form: ProfileForm;
  setForm: Dispatch<SetStateAction<ProfileForm>>;
  addressValue: AddressValue;
  setAddressValue: Dispatch<SetStateAction<AddressValue>>;
  isLoading: boolean;
}

/** Carga el perfil del owner autenticado al montar (FC163 F2B3, split de OwnerProfilePanel). */
export function useProfileLoad(): UseProfileLoadResult {
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [addressValue, setAddressValue] = useState<AddressValue>(EMPTY_ADDRESS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async (): Promise<void> => {
      try {
        const res = await api.get<{ success: boolean; data: ProfileApiData }>('/owners/me/profile');
        const d = res.data?.data;
        if (!d || cancelled) return;
        setForm({
          rfc: d.rfc || '',
          razonSocial: d.razonSocial || '',
          telefono: d.telefono || '',
          especialidades: Array.isArray(d.especialidades) ? d.especialidades : [],
        });
        const addr = await hydrateAddress(d);
        if (!cancelled) setAddressValue(addr);
      } catch {
        // profile not found or network error — form stays empty
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadProfile();
    return (): void => {
      cancelled = true;
    };
  }, []);

  return { form, setForm, addressValue, setAddressValue, isLoading };
}
