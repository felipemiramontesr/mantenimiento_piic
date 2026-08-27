import { useState } from 'react';
import api from '../../../api/client';
import { AddressValue } from '../../Common/ArchonAddressField';
import { ProfileForm } from './types';

export interface UseProfileSaveResult {
  isSubmitting: boolean;
  success: boolean;
  error: string | null;
  handleSave: () => Promise<void>;
}

/** Guarda el perfil del owner autenticado (FC163 F2B3, split de OwnerProfilePanel). */
export function useProfileSave(
  form: ProfileForm,
  addressValue: AddressValue,
  roleId: number
): UseProfileSaveResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const payload: Record<string, unknown> = {
        rfc: form.rfc || null,
        razonSocial: form.razonSocial || null,
        telefono: form.telefono || null,
      };
      if (roleId === 3)
        payload.especialidades = form.especialidades.length > 0 ? form.especialidades : null;
      if (addressValue.neighborhoodId) {
        payload.neighborhoodId = Number.parseInt(addressValue.neighborhoodId, 10);
        if (addressValue.calle) payload.calle = addressValue.calle;
        if (addressValue.numeroExt) payload.numeroExt = addressValue.numeroExt;
        if (addressValue.numeroInt) payload.numeroInt = addressValue.numeroInt;
      }
      await api.patch('/owners/me/profile', payload);
      setSuccess(true);
    } catch {
      setError('No se pudo guardar el perfil. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, success, error, handleSave };
}
