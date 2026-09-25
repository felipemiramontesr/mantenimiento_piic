import { AxiosRequestConfig } from 'axios';
import api from './client';
import { UserIndustrial } from '../types/user';

/**
 * FC185 F3/F4 — Sovereign_MFA_TOTP_Two_Step_Authentication. Cliente tipado para
 * `/v1/auth/mfa/setup` + `/confirm` (F3) + `/verify` (F4). `token` es opcional en setup/confirm:
 * el flujo voluntario (Configuración, ya con sesión) deja que el interceptor de `client.ts`
 * adjunte el access token real; el flujo obligatorio (Ω/MU sin enrolar, atrapados en Login.tsx
 * antes de tener sesión) pasa el `setupToken` de alcance mínimo que el propio `/login` entrega en
 * ese caso.
 */

function authConfig(token?: string): AxiosRequestConfig | undefined {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}

export interface MfaSetupData {
  secretBase32: string;
  otpauthUri: string;
}

/** POST /mfa/setup — genera un secreto nuevo; el backend lo guarda cifrado como pendiente. */
export async function beginMfaSetup(token?: string): Promise<MfaSetupData> {
  const res = await api.post('/auth/mfa/setup', undefined, authConfig(token));
  return res.data.data as MfaSetupData;
}

/** POST /mfa/confirm — valida el primer código real y activa el MFA; responde los 8 códigos de
 *  respaldo en texto plano UNA sola vez. */
export async function confirmMfaSetup(code: string, token?: string): Promise<string[]> {
  const res = await api.post('/auth/mfa/confirm', { code }, authConfig(token));
  return res.data.data.backupCodes as string[];
}

export interface MfaVerifySuccess {
  token: string;
  user: UserIndustrial;
}

/** F4 — POST /mfa/verify. Canjea el `mfaToken` (emitido por `/login` cuando `mfaRequired: true`)
 *  + un código TOTP o de respaldo por la sesión completa — misma forma de respuesta que
 *  `/auth/login` (ambos pasan por `issueSessionResponse` en el backend). */
export async function verifyMfaChallenge(
  mfaToken: string,
  code: string
): Promise<MfaVerifySuccess> {
  const res = await api.post('/auth/mfa/verify', { mfaToken, code });
  return res.data as MfaVerifySuccess;
}

/** FC195 — métodos de segundo factor. Ω y MU solo pueden usar `totp` (el backend lo impone). */
export type MfaMethod = 'totp' | 'email';

export interface EmailMfaSetupData {
  emailSetupToken: string;
  maskedEmail: string;
}

/** FC195 F3 — POST /mfa/email/setup: envía el código de activación al correo registrado. */
export async function beginEmailMfaSetup(token?: string): Promise<EmailMfaSetupData> {
  const res = await api.post('/auth/mfa/email/setup', undefined, authConfig(token));
  return res.data.data as EmailMfaSetupData;
}

/** FC195 F3 — POST /mfa/email/verify-setup: confirma con el código recibido; responde los 8
 *  códigos de respaldo UNA sola vez. */
export async function confirmEmailMfaSetup(
  emailSetupToken: string,
  code: string,
  token?: string
): Promise<string[]> {
  const res = await api.post(
    '/auth/mfa/email/verify-setup',
    { emailSetupToken, code },
    authConfig(token)
  );
  return res.data.data.backupCodes as string[];
}

export interface EmailMfaResendData {
  token: string;
  maskedEmail: string | null;
  codeSent: boolean;
  resendsLeft: number;
}

/** FC195 F3 — POST /mfa/email/resend: código nuevo (el anterior deja de servir) para un reto de
 *  login o de enrolamiento; responde un token NUEVO del mismo reto, que reemplaza al anterior. */
export async function resendEmailMfaCode(challengeToken: string): Promise<EmailMfaResendData> {
  const res = await api.post('/auth/mfa/email/resend', { token: challengeToken });
  return res.data.data as EmailMfaResendData;
}
