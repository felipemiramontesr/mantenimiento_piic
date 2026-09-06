import React, { useState, useEffect } from 'react';
import { resolveProfileImageUrl } from '../../../utils/imageUtils';
import { ProfileFormData, EMPTY_PROFILE_FORM } from './types';

export interface ProfileFormHydration {
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
}

/** Hidrata `formData` desde `currentUser` (camelCase/snake_case) al montar o
 * cambiar de usuario — extraído de `ArchonProfilePanel.tsx` para mantenerlo
 * bajo el presupuesto de Gate2 (FC165 F3 Slice3.1 Batch2, Dual-Gate
 * Isolation). */
export default function useProfileFormHydration(currentUser: unknown): ProfileFormHydration {
  const [formData, setFormData] = useState<ProfileFormData>(EMPTY_PROFILE_FORM);

  useEffect(() => {
    if (currentUser) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = currentUser as any;
      // 🔱 Asset Resolution Engine: Ensure filename is converted to Sovereign URL
      const rawImageUrl = user.imageUrl || user.image_url || user.profile_picture_url || '';
      setFormData({
        fullName: user.fullName || user.full_name || '',
        email: user.email || '',
        employeeNumber: user.employeeNumber || user.employee_number || '',
        imageUrl: resolveProfileImageUrl(rawImageUrl, user.id),
        password: '',
        confirmPassword: '',
      });
    }
  }, [currentUser]);

  return { formData, setFormData };
}
