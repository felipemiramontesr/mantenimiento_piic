import { PoolConnection } from 'mysql2/promise';
import * as ProfilesRepository from './arcsialProfiles.repository';
import { isBlockedEitherWay } from './arcsialRelations.repository';
import { displayNameFor, handleCandidates } from './arcsialHandle';
import { recordAuditLog } from './auditService';
import type { ArcsialProfile } from './arcsialProfiles.repository';

/**
 * FC209 F2 — perfiles de Arcsial: alta atómica en el registro (R 540/542_AN), cambio del handle propio
 * y búsqueda por handle exacto con 404 opaco (sin handle o con bloqueo en cualquier sentido).
 */

export interface ArcsialError {
  readonly ok: false;
  readonly status: number;
  readonly code: string;
  readonly message: string;
}

export const USER_NOT_FOUND: ArcsialError = {
  ok: false,
  status: 404,
  code: 'USER_NOT_FOUND',
  message: 'No se encontró el usuario',
};

/** ¿Es el choque de un índice único (handle tomado)? */
export function isDuplicateEntry(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'ER_DUP_ENTRY';
}

/** Intenta un candidato: devuelve el handle si entró, `null` si ya estaba tomado. */
async function tryHandle(
  profile: { userId: number; fullName: string; handle: string },
  connection: PoolConnection
): Promise<string | null> {
  try {
    const displayName = displayNameFor(profile.fullName, profile.handle);
    await ProfilesRepository.insertProfile(
      { userId: profile.userId, handle: profile.handle, displayName },
      connection
    );
    return profile.handle;
  } catch (error) {
    if (isDuplicateEntry(error)) return null;
    throw error;
  }
}

/**
 * Crea el perfil del usuario recién insertado, en SU transacción: `arc_` + 8 hex del uuid, y ante
 * un handle tomado 12, 16 y 26, uno tras otro. Si todos chocan (o no hay uuid) lanza: la TX del
 * registro revierte.
 */
export async function createProfileForNewUser(
  userId: number,
  fullName: string,
  connection: PoolConnection
): Promise<string> {
  const uuid = await ProfilesRepository.findUserUuid(userId, connection);
  if (!uuid) throw new Error(`FC209: el usuario ${userId} no tiene uuid para su handle`);
  const handle = await handleCandidates(uuid).reduce<Promise<string | null>>(
    (previous, candidate) =>
      previous.then(
        (taken) => taken ?? tryHandle({ userId, fullName, handle: candidate }, connection)
      ),
    Promise.resolve(null)
  );
  if (handle === null) throw new Error(`FC209: sin handle libre para el usuario ${userId}`);
  return handle;
}

/** GET /v1/social/users/lookup — handle exacto; inexistente o bloqueado ⇒ el mismo 404. */
export async function lookupByHandle(
  callerId: number,
  handle: string
): Promise<{ ok: true; profile: ArcsialProfile } | ArcsialError> {
  const profile = await ProfilesRepository.findProfileByHandle(handle);
  if (!profile || (await isBlockedEitherWay(callerId, profile.userId))) return USER_NOT_FOUND;
  return { ok: true, profile };
}

const HANDLE_TAKEN: ArcsialError = {
  ok: false,
  status: 409,
  code: 'HANDLE_ALREADY_TAKEN',
  message: 'Ese handle ya está en uso',
};

/** PATCH /v1/social/profile/handle — patrón validado en la ruta; único o 409; queda en auditoría. */
export async function changeOwnHandle(
  userId: number,
  handle: string
): Promise<{ ok: true; handle: string } | ArcsialError> {
  const previous = await ProfilesRepository.findHandleByUserId(userId);
  if (previous === null) return USER_NOT_FOUND;
  try {
    await ProfilesRepository.updateHandle(userId, handle);
  } catch (error) {
    if (isDuplicateEntry(error)) return HANDLE_TAKEN;
    throw error;
  }
  await recordAuditLog({
    entity_type: 'user',
    entity_id: String(userId),
    action: 'UPDATE',
    snapshot_before: { handle: previous },
    snapshot_after: { event: 'CHANGE_ARCIAL_HANDLE', handle },
    reason: 'CHANGE_ARCIAL_HANDLE — el usuario cambia su @handle de Arcsial (FC209 F2)',
    user_id: userId,
  });
  return { ok: true, handle };
}
