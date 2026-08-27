import { type Dispatch, type SetStateAction } from 'react';
import { AddressValue } from '../../Common/ArchonAddressField';
import { ProfileForm } from './types';
import { useProfileLoad } from './useProfileLoad';
import { useProfileSave } from './useProfileSave';

export interface UseOwnerProfileStateResult {
  form: ProfileForm;
  setForm: Dispatch<SetStateAction<ProfileForm>>;
  addressValue: AddressValue;
  setAddressValue: Dispatch<SetStateAction<AddressValue>>;
  isLoading: boolean;
  isSubmitting: boolean;
  success: boolean;
  error: string | null;
  handleSave: () => Promise<void>;
}

/** Compone carga + guardado del perfil del owner (FC163 F2B3, split de OwnerProfilePanel). */
export function useOwnerProfileState(roleId: number): UseOwnerProfileStateResult {
  const { form, setForm, addressValue, setAddressValue, isLoading } = useProfileLoad();
  const { isSubmitting, success, error, handleSave } = useProfileSave(form, addressValue, roleId);

  return {
    form,
    setForm,
    addressValue,
    setAddressValue,
    isLoading,
    isSubmitting,
    success,
    error,
    handleSave,
  };
}
