import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useProfileFormHydration from './ArchonProfilePanel/useProfileFormHydration';
import useProfileSubmit from './ArchonProfilePanel/useProfileSubmit';
import ProfileFormBanners from './ArchonProfilePanel/ProfileFormBanners';
import PersonalDataCard from './ArchonProfilePanel/PersonalDataCard';
import SecurityAccessCard from './ArchonProfilePanel/SecurityAccessCard';

interface ProfileSubmitButtonProps {
  isSubmitting: boolean;
  canSubmit: boolean;
}

/** Fila de acción con el botón de submit — extraída de `ArchonProfilePanel`
 * para mantenerlo bajo el presupuesto de Gate2 (FC165 F3 Slice3.1 Batch2,
 * Dual-Gate Isolation). */
function ProfileSubmitButton({
  isSubmitting,
  canSubmit,
}: ProfileSubmitButtonProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
      <div />
      <button
        type="submit"
        disabled={isSubmitting || !canSubmit}
        className={`btn-sentinel-emerald w-full uppercase font-black text-archon-md tracking-[0.4em] flex items-center justify-center gap-4 rounded-[4px] transition-all duration-500 ${
          !canSubmit ? 'opacity-30 grayscale cursor-not-allowed' : 'shadow-xl'
        }`}
      >
        {isSubmitting ? 'Sincronizando...' : 'Actualizar Perfil'}
        <Save size={16} />
      </button>
    </div>
  );
}

/**
 * 🔱 Archon Component: ArchonProfilePanel
 * Implementation: Sovereign Identity Management (Profile Settings)
 * Aesthetic: Industrial Registry Standard
 * v.20.0.0 — v.21.0.0 (FC165 F3 Slice3.1 Batch2): split en `ArchonProfilePanel/`
 * (Dual-Gate Isolation, Gate1 max-lines:400 + Gate2 max-lines-per-function:50).
 */
const ArchonProfilePanel: React.FC = (): React.JSX.Element => {
  const { currentUser, updateCurrentUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { formData, setFormData } = useProfileFormHydration(currentUser);
  const { isSubmitting, success, error, handleFormSubmit } = useProfileSubmit(
    currentUser,
    formData,
    updateCurrentUser,
    selectedFile,
    setSelectedFile
  );

  const passwordsMatch = formData.password === formData.confirmPassword;
  const canSubmit = !formData.password || (passwordsMatch && formData.password.length >= 8);

  return (
    <div className="animate-in fade-in duration-700">
      <form
        onSubmit={handleFormSubmit}
        className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-[1700px] mx-auto pb-20 space-y-4"
      >
        <ProfileFormBanners success={success} error={error} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full items-start">
          <PersonalDataCard
            formData={formData}
            setFormData={setFormData}
            username={currentUser?.username || ''}
            setSelectedFile={setSelectedFile}
          />
          <SecurityAccessCard
            formData={formData}
            setFormData={setFormData}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            roleName={currentUser?.roleName || 'Usuario'}
          />
        </div>

        <ProfileSubmitButton isSubmitting={isSubmitting} canSubmit={canSubmit} />
      </form>
    </div>
  );
};

export default ArchonProfilePanel;
