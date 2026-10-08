import api from '../../../../api/client';

/**
 * FC204 F4 — contrato de la consola de usuarios de plataforma (Ω-exclusiva):
 * `GET /v1/cosmology/users`, `POST /v1/cosmology/users/:id/mfa/reset` y `DELETE /v1/auth/users/:id`.
 * Las dos acciones soberanas exigen el nombre exacto del Universo del usuario (`confirmUniverseName`).
 */

export const PLATFORM_USERS_PAGE_SIZE = 25;

/** `''` = todos · `'itinerant'` = sin Universo · número = un Universo. */
export type PlatformUserScope = '' | 'itinerant' | number;

export interface PlatformUser {
  readonly id: number;
  readonly username: string;
  readonly fullName: string | null;
  readonly email: string;
  readonly isActive: boolean;
  /** FC207 F2 — `0` = la cuenta soberana Ω (no pertenece a ningún Universo). */
  readonly roleId: number;
  readonly tenantId: number | null;
  readonly tenantName: string | null;
  readonly cosmonautType: 'MU' | 'ARC' | null;
}

export interface PlatformUsersQuery {
  readonly scope: PlatformUserScope;
  readonly search: string;
  readonly page: number;
}

export interface PlatformUsersPage {
  readonly users: PlatformUser[];
  readonly total: number;
}

/** Una página de la consola; una respuesta sin lista cae a vacía. */
export async function fetchPlatformUsers(query: PlatformUsersQuery): Promise<PlatformUsersPage> {
  const params: Record<string, string | number> = {
    page: query.page,
    pageSize: PLATFORM_USERS_PAGE_SIZE,
  };
  if (query.scope !== '') params.tenantId = query.scope;
  if (query.search.trim()) params.q = query.search.trim();
  const res = await api.get<{ success: boolean; data?: PlatformUser[]; total?: number }>(
    '/cosmology/users',
    { params }
  );
  const users = Array.isArray(res.data?.data) ? res.data.data : [];
  return { users, total: Number(res.data?.total ?? users.length) };
}

/** Restablece el 2FA de un usuario (Ω escribe el nombre de su Universo). */
export async function resetPlatformUserMfa(userId: number, universeName: string): Promise<void> {
  await api.post(`/cosmology/users/${userId}/mfa/reset`, { confirmUniverseName: universeName });
}

/** FC206 F1 — vincula un usuario itinerante a un Universo existente (Ω escribe el nombre exacto). */
export async function linkPlatformUserToUniverse(
  userId: number,
  tenantId: number,
  role: 'ARC' | 'MU',
  universeName: string
): Promise<void> {
  await api.post(`/cosmology/users/${userId}/link-universe`, {
    tenantId,
    role,
    confirmUniverseName: universeName,
  });
}

/** Da de baja a un usuario (Ω escribe el nombre de su Universo y un motivo). */
export async function deletePlatformUser(
  userId: number,
  universeName: string,
  reason: string
): Promise<void> {
  await api.delete(`/auth/users/${userId}`, {
    data: { reason, confirmUniverseName: universeName },
  });
}

const ERROR_MESSAGES: Record<string, string> = {
  UNIVERSE_NAME_MISMATCH: 'El nombre no coincide con el Universo del usuario.',
  USER_WITHOUT_UNIVERSE: 'El usuario no pertenece a ningún Universo; esta acción no aplica.',
  USER_NOT_FOUND: 'El usuario ya no existe.',
  MFA_NOT_ENROLLED: 'El usuario no tiene 2FA configurado; no hay nada que restablecer.',
  FORBIDDEN: 'Acción exclusiva de GrayMan.',
  // FC206 F1 — vinculación directa a un Universo.
  LINKED_USER_NOT_FOUND: 'El usuario ya no existe.',
  LINKED_USER_INACTIVE: 'El usuario está suspendido; no se puede vincular.',
  LINKED_USER_ALREADY_MEMBER: 'El usuario ya pertenece a un Universo.',
  LINKED_USER_MISSING_BILLING_PROFILE: 'El usuario no completó su registro fiscal.',
  CANNOT_LINK_OMEGA_USER: 'La cuenta soberana Omega no puede vincularse a un Universo.', // FC207 F2
  UNIVERSE_NOT_FOUND: 'El Universo ya no existe.',
  MU_ALREADY_DESIGNATED: 'Ese Universo ya tiene Master of Universe; vincúlalo como ARC.',
  ROLE_NOT_CONFIGURED: 'El rol no está configurado en el servidor.',
};

/** Mensaje en español para el error de una acción soberana (códigos del backend de FC204 F3). */
export function describeSovereignActionError(err: unknown): string {
  const data = (err as { response?: { data?: { code?: string; error?: string } } })?.response?.data;
  const code = data?.code ?? data?.error;
  return (code && ERROR_MESSAGES[code]) || 'No se pudo completar la acción. Intenta de nuevo.';
}
