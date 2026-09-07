import React from 'react';
import { CheckCircle, Shield } from 'lucide-react';

export interface ProfileFormBannersProps {
  readonly success: boolean;
  readonly error: string | null;
}

/** Bandas de éxito/error sobre el formulario de perfil. */
export default function ProfileFormBanners({
  success,
  error,
}: ProfileFormBannersProps): React.JSX.Element {
  return (
    <>
      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <CheckCircle size={20} className="text-emerald-500" />
            <p className="text-archon-md uppercase font-black tracking-widest text-[#0f2a44]">
              Perfil actualizado con éxito. La identidad ha sido sincronizada.
            </p>
          </div>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <Shield size={20} className="text-red-500" />
            <p className="text-archon-md uppercase font-black tracking-widest text-[#0f2a44]">
              {error}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
