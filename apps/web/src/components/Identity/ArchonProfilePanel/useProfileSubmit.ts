import { useState, FormEvent } from 'react';
import { ProfileFormData } from './types';
import { patchProfile, uploadProfilePhoto } from './profileApi';

export interface ProfileSubmitState {
  isSubmitting: boolean;
  success: boolean;
  error: string | null;
  handleFormSubmit: (e: FormEvent) => Promise<void>;
}

/** Orquesta el submit de dos etapas (PATCH de datos básicos + subida de foto
 * no-bloqueante) — extraído de `ArchonProfilePanel.tsx` para mantenerlo bajo
 * el presupuesto de Gate2 (FC165 F3 Slice3.1 Batch2, Dual-Gate Isolation). */
export default function useProfileSubmit(
  currentUser: { id: number | string } | null,
  formData: ProfileFormData,
  updateCurrentUser: (patch: Record<string, string>) => void,
  selectedFile: File | null,
  setSelectedFile: (f: File | null) => void
): ProfileSubmitState {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🏆 Stage 2: Secondary Asset Persistence (Non-blocking)
  const persistSelectedPhoto = async (userId: number | string): Promise<void> => {
    if (!selectedFile) return;
    try {
      const finalUrl = await uploadProfilePhoto(userId, selectedFile);
      if (finalUrl) {
        updateCurrentUser({ imageUrl: finalUrl });
        setSelectedFile(null);
      }
    } catch (uploadErr) {
      // eslint-disable-next-line no-console
      console.error('⚠️ [Archon] Profile picture persistence failed:', uploadErr);
      setError(`Datos guardados, pero error al procesar la imagen (ID Ref: ${userId}).`);
    }
  };

  const handleFormSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (!currentUser) return;
      // 🏆 Stage 1: Basic Data Synchronization
      const ok = await patchProfile({ userId: currentUser.id, ...formData });
      if (ok) {
        updateCurrentUser({
          fullName: formData.fullName,
          email: formData.email,
          employeeNumber: formData.employeeNumber,
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 6000);
        await persistSelectedPhoto(currentUser.id);
      }
    } catch {
      setError('Falla crítica al sincronizar la identidad. Verifique su conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, success, error, handleFormSubmit };
}
