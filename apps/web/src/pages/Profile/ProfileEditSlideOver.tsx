import React, { useState } from 'react';
import { X, User, Mail, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import ArchonField from '../../components/ArchonField';

interface ProfileEditSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileSlideOverBackdropProps {
  onClose: () => void;
}

/** Backdrop clickeable/teclado del slide-over de perfil (FC163 F1B-1, split Alfa 219_AN). */
const ProfileSlideOverBackdrop: React.FC<ProfileSlideOverBackdropProps> = ({ onClose }) => (
  <div
    data-testid="profile-edit-overlay"
    className="fixed inset-0 bg-black/50 z-[70] backdrop-blur-sm"
    aria-hidden="true"
    onClick={onClose}
    onKeyDown={(e: React.KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    }}
  />
);

interface ProfileSlideOverHeaderProps {
  onClose: () => void;
}

/** Cabecera con título y botón de cierre (FC163 F1B-1, split Alfa 219_AN). */
const ProfileSlideOverHeader: React.FC<ProfileSlideOverHeaderProps> = ({ onClose }) => (
  <div className="flex items-center justify-between px-6 py-5 border-b border-[#0f2a44]/10">
    <div className="card-sovereign-header !mb-0">
      <User size={22} className="text-pinnacle-navy" />
      <h3 className="card-sovereign-title text-archon-xl opacity-100">Editar Perfil</h3>
    </div>
    <button
      type="button"
      onClick={onClose}
      data-testid="profile-edit-close"
      className="text-[#0f2a44]/40 hover:text-[#0f2a44] transition-colors"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);

interface ProfileUsernameFieldProps {
  username: string;
}

/** Campo de username inalterable (FC163 F1B-1, split Alfa 219_AN — sub-split de ProfileEditForm). */
const ProfileUsernameField: React.FC<ProfileUsernameFieldProps> = ({ username }) => (
  <ArchonField label="Nombre de usuario (Inalterable)" icon={User}>
    <input
      data-testid="profile-edit-username"
      type="text"
      disabled
      value={username}
      className="archon-input opacity-50 cursor-not-allowed"
    />
  </ArchonField>
);

interface ProfileEmailFieldProps {
  email: string;
  setEmail: (v: string) => void;
}

/** Campo de correo editable (FC163 F1B-1, split Alfa 219_AN — sub-split de ProfileEditForm). */
const ProfileEmailField: React.FC<ProfileEmailFieldProps> = ({ email, setEmail }) => (
  <ArchonField label="Correo electrónico" icon={Mail}>
    <input
      data-testid="profile-edit-email"
      type="email"
      value={email}
      onChange={(e): void => setEmail(e.target.value)}
      className="archon-input"
    />
  </ArchonField>
);

interface ProfileFormStatusProps {
  error: string | null;
  success: boolean;
}

/** Mensajes de error/éxito del formulario (FC163 F1B-1, split Alfa 219_AN — sub-split de ProfileEditForm). */
const ProfileFormStatus: React.FC<ProfileFormStatusProps> = ({ error, success }) => (
  <>
    {error && (
      <p data-testid="profile-edit-error" className="text-red-600 text-archon-sm font-black">
        {error}
      </p>
    )}
    {success && (
      <p data-testid="profile-edit-success" className="text-emerald-600 text-archon-sm font-black">
        Perfil actualizado correctamente.
      </p>
    )}
  </>
);

interface ProfileFormSaveButtonProps {
  isSaving: boolean;
}

/** Botón de guardado con estado de carga (FC163 F1B-1, split Alfa 219_AN — sub-split de ProfileEditForm). */
const ProfileFormSaveButton: React.FC<ProfileFormSaveButtonProps> = ({ isSaving }) => (
  <div className="flex justify-end mt-auto pt-4 border-t border-[#0f2a44]/10">
    <button
      type="submit"
      data-testid="profile-edit-save"
      disabled={isSaving}
      className="btn-sentinel-emerald text-xs"
    >
      {isSaving ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Save className="w-3.5 h-3.5" />
      )}
      Guardar
    </button>
  </div>
);

interface ProfileEditFormProps {
  username: string;
  email: string;
  setEmail: (v: string) => void;
  error: string | null;
  success: boolean;
  isSaving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/** Formulario de edición (username inalterable + email + estado) (FC163 F1B-1, split Alfa 219_AN). */
const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  username,
  email,
  setEmail,
  error,
  success,
  isSaving,
  onSubmit,
}) => (
  <form className="flex flex-col gap-5 px-6 py-6 flex-1 overflow-y-auto" onSubmit={onSubmit}>
    {/* Username — inalterable: el schema del backend no lo acepta (FC 076 R6) */}
    <ProfileUsernameField username={username} />
    {/* Email */}
    <ProfileEmailField email={email} setEmail={setEmail} />
    <ProfileFormStatus error={error} success={success} />
    <ProfileFormSaveButton isSaving={isSaving} />
  </form>
);

const ProfileEditSlideOver: React.FC<ProfileEditSlideOverProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateCurrentUser } = useAuth();
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // FC 076 F2 (R6) — el endpoint exige envoltorio {data, reason}, resuelve
  // por id numérico (no uuid), y su schema NO acepta username (inalterable,
  // igual que en ArchonProfilePanel): el payload previo fallaba por las
  // tres vías a la vez.
  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);
    try {
      await api.patch(`/auth/users/${currentUser?.id}`, {
        data: { email: email.toLowerCase() },
        reason: 'Actualización de perfil propio (Arcsial)',
      });
      updateCurrentUser({ email });
      setSuccess(true);
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <ProfileSlideOverBackdrop onClose={onClose} />

      <div
        data-testid="profile-edit-slideover"
        className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[80] flex flex-col"
      >
        <ProfileSlideOverHeader onClose={onClose} />
        <ProfileEditForm
          username={currentUser?.username ?? ''}
          email={email}
          setEmail={setEmail}
          error={error}
          success={success}
          isSaving={isSaving}
          onSubmit={(e): void => {
            handleSave(e).catch(() => undefined);
          }}
        />
      </div>
    </>
  );
};

export default ProfileEditSlideOver;
