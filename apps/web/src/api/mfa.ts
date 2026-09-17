import { AxiosRequestConfig } from 'axios';
import api from './client';

/**
 * FC185 F3 — Sovereign_MFA_TOTP_Two_Step_Authentication (Frontend_MFA_Enrolment_And_Security_Wizard).
 * Cliente tipado para `/v1/auth/mfa/setup` + `/confirm`. `token` es opcional: el flujo voluntario
 * (Configuración, ya con sesión) deja que el interceptor de `client.ts` adjunte el access token
 * real; el flujo obligatorio (Ω/MU sin enrolar, atrapados en Login.tsx antes de tener sesión) pasa
 * el `setupToken` de alcance mínimo que el propio `/login` entrega en ese caso.
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
