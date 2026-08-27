import React from 'react';
import { CheckCircle } from 'lucide-react';

export interface ProfileStatusMessagesProps {
  success: boolean;
  error: string | null;
}

/** Mensajes de éxito/error del guardado de perfil (FC163 F2B3, split de OwnerProfilePanel). */
export const ProfileStatusMessages: React.FC<ProfileStatusMessagesProps> = ({ success, error }) => (
  <>
    {success && (
      <div
        data-testid="owner-profile-success"
        className="flex items-center gap-2 text-green-400 text-sm"
      >
        <CheckCircle className="w-4 h-4" />
        Perfil actualizado correctamente.
      </div>
    )}
    {error && (
      <p data-testid="owner-profile-error" className="text-red-400 text-sm">
        {error}
      </p>
    )}
  </>
);
