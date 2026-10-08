import * as PlatformUsersRepository from './platformUsers.repository';
import EncryptionService from './encryption';
import type { PlatformUserScope } from './platformUsers.repository';

/**
 * FC204 F3 — sovereign platform-users console (Ω only, §24.5): listing across every Universo and the
 * named-Universe confirmation shared by the two sovereign actions (2FA reset and user deletion).
 *
 * T1 of FC204 — AccionSoberanaPermitida(O, U, C, T) ≡ O ∧ U ∧ C ∧ T. O (Ω) is the route guard and C
 * (a sovereign action) is the route itself; this module decides T (the user's Universo has id > 0)
 * and U (the typed name matches it), in that order: ¬T or ¬U → 400 (R 485_AN, reading 1: a user
 * with no Universo is T = ⊥ — it can be listed as itinerant, never reset or deleted from here).
 */

export const PLATFORM_USERS_PAGE_SIZE_MAX = 100;

export interface PlatformUserQuery {
  readonly scope: PlatformUserScope;
  readonly search?: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface PlatformUser {
  id: number;
  username: string;
  fullName: string | null;
  email: string;
  isActive: boolean;
  /** FC207 F2 — `0` = Ω: the console hides «Vincular a Universo» for it. */
  roleId: number;
  tenantId: number | null;
  tenantName: string | null;
  cosmonautType: 'MU' | 'ARC' | null;
}

export interface UniverseConfirmationFailure {
  ok: false;
  status: 400 | 404;
  code: 'USER_NOT_FOUND' | 'USER_WITHOUT_UNIVERSE' | 'UNIVERSE_NAME_MISMATCH';
  message: string;
}

/** One page of the console: (user, Universo) rows and the total matching the filter. */
export async function listPlatformUsers(
  query: PlatformUserQuery
): Promise<{ data: PlatformUser[]; total: number }> {
  const { rows, total } = await PlatformUsersRepository.listPlatformUsers({
    scope: query.scope,
    search: query.search,
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  });
  return {
    data: rows.map((row) => ({
      id: row.id,
      username: row.username,
      fullName: row.fullName,
      // FC205 F1 (PU-DEF1) — `users.email` se guarda cifrado (iv:tag:hex). Mismo guard que
      // cosmology.queries/authSession: nulo o vacío → ''; formato roto → el texto guardado (T1 fila 2).
      // El claro solo sale por esta ruta soberana (requireOmega, Invariante 1).
      email: row.email ? EncryptionService.decrypt(row.email) : '',
      isActive: Boolean(row.isActive),
      roleId: Number(row.roleId),
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      cosmonautType: row.cosmonautType,
    })),
    total,
  };
}

/** Guards 2–3 of T1 for a sovereign action on `userId`: the user exists, belongs to a Universo with
 *  id > 0 (T) and `confirmUniverseName` is that Universo's exact name (U). `null` = may proceed. */
export async function checkUniverseConfirmation(
  userId: number,
  confirmUniverseName: string
): Promise<UniverseConfirmationFailure | null> {
  const rows = await PlatformUsersRepository.findUserUniverses(userId);
  if (rows.length === 0) {
    return { ok: false, status: 404, code: 'USER_NOT_FOUND', message: 'El usuario no existe' };
  }
  const universes = rows.filter((row) => row.tenantId !== null && row.tenantId > 0);
  if (universes.length === 0) {
    return {
      ok: false,
      status: 400,
      code: 'USER_WITHOUT_UNIVERSE',
      message: 'El usuario no pertenece a ningún Universo; esta acción no aplica',
    };
  }
  const typed = confirmUniverseName.trim();
  if (!universes.some((row) => row.tenantName === typed)) {
    return {
      ok: false,
      status: 400,
      code: 'UNIVERSE_NAME_MISMATCH',
      message: 'El nombre no coincide con el Universo del usuario',
    };
  }
  return null;
}
