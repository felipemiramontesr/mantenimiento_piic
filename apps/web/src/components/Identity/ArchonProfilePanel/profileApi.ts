import api from '../../../api/client';
import { compressImage } from '../../../utils/imageUtils';

export interface PatchProfileArgs {
  userId: number | string;
  fullName: string;
  email: string;
  employeeNumber: string;
  password: string;
}

/** FC 076 F2 — PATCH /auth/users/:id exige envoltorio { data, reason } (auth.ts
 * Zod schema); el payload plano previo producía 400 U1 en el 100% de los
 * envíos. `reason` fijo de autoservicio (≥5 chars, es-MX) — el endpoint lo
 * persiste en audit_log. La foto NO viaja aquí: su único canal es
 * upload-profile (ver `uploadProfilePhoto`). */
export async function patchProfile(args: PatchProfileArgs): Promise<boolean> {
  const data: Record<string, string> = {
    fullName: args.fullName,
    email: args.email.toLowerCase(),
    employeeNumber: args.employeeNumber,
  };
  if (args.password) data.password = args.password;
  const response = await api.patch(`/auth/users/${args.userId}`, {
    data,
    reason: 'Actualización de perfil propio (autoservicio)',
  });
  return Boolean(response.data.success || response.status === 200);
}

/** v.3.0.0 — Base64 JSON Transport (bypasses mod_security): comprime
 * client-side (400×400, 80% JPEG) y envía como JSON, no multipart/form-data. */
export async function uploadProfilePhoto(
  userId: number | string,
  file: File
): Promise<string | null> {
  const { base64, mime } = await compressImage(file, 400, 0.8);
  const uploadRes = await api.post(`users/${String(userId)}/upload-profile`, {
    image: base64,
    mime,
  });
  if (uploadRes.data.success || uploadRes.data.url) {
    return uploadRes.data.url || `${api.defaults.baseURL}/users/${userId}/profile-image`;
  }
  return null;
}
