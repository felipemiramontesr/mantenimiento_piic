import { PoolConnection } from 'mysql2/promise';
import * as ProfilesRepository from './arcsialProfiles.repository';
import { isBlockedEitherWay } from './arcsialRelations.repository';
import { insertUserActor } from './arcsialActors.repository';
import { displayNameFor, handleCandidates, isReservedHandle } from './arcsialHandle';
import type { ArcsialProfile, BlockEntry, ContactEntry } from './arcsialProfiles.repository';

/**
 * FC209 F2 — perfiles de Arcsial: alta atómica en el registro (R 540/542_AN) y búsqueda por handle
 * exacto con 404 opaco (sin handle o con bloqueo en cualquier sentido). FC210 F2: el alta crea también
 * el actor USER en la misma TX; el cambio de handle vive en `arcsialActorHandle.service.ts`.
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

/**
 * Intenta un candidato: devuelve el handle si entró, `null` si es reservado o ya estaba tomado. El
 * actor va primero: `arcsial_actors` es el espacio único de handles (personas y universos).
 */
async function tryHandle(
  profile: { userId: number; fullName: string; handle: string },
  connection: PoolConnection
): Promise<string | null> {
  if (isReservedHandle(profile.handle)) return null;
  try {
    const row = {
      userId: profile.userId,
      handle: profile.handle,
      displayName: displayNameFor(profile.fullName, profile.handle),
    };
    await insertUserActor(row, connection);
    await ProfilesRepository.insertProfile(row, connection);
    return profile.handle;
  } catch (error) {
    if (isDuplicateEntry(error)) return null;
    throw error;
  }
}

/**
 * Crea el actor USER y el perfil del usuario recién insertado, en SU transacción: `arc_` + 8 hex del
 * uuid, y ante un handle reservado o tomado 12, 16 y 26, uno tras otro (R 564_AN). Si todos fallan
 * (o no hay uuid) lanza: la TX del registro revierte.
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

/** Forma pública del FC (`{ id, handle, displayName, avatarUrl }`): nunca correo ni fisco. */
export interface PublicProfile {
  readonly id: number;
  readonly handle: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
}

/** Del registro de la base a la forma pública. */
function toPublic(profile: ArcsialProfile): PublicProfile {
  return {
    id: profile.userId,
    handle: profile.handle,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  };
}

/** GET /v1/social/users/lookup — handle exacto; inexistente o bloqueado ⇒ el mismo 404. */
export async function lookupByHandle(
  callerId: number,
  handle: string
): Promise<({ ok: true } & PublicProfile) | ArcsialError> {
  const profile = await ProfilesRepository.findProfileByHandle(handle);
  if (!profile || (await isBlockedEitherWay(callerId, profile.userId))) return USER_NOT_FOUND;
  return { ok: true, ...toPublic(profile) };
}

/** GET /v1/social/profile (FC209 F3) — perfil propio y, para la UI, el Universo donde es MU. */
export async function getOwnProfile(
  userId: number
): Promise<
  ({ ok: true; muUniverse: { id: number; label: string } | null } & PublicProfile) | ArcsialError
> {
  const profile = await ProfilesRepository.findProfileByUserId(userId);
  if (!profile) return USER_NOT_FOUND;
  const muUniverse = await ProfilesRepository.findMuUniverse(userId);
  return { ok: true, ...toPublic(profile), muUniverse };
}

/** GET /v1/social/contacts (FC209 F3) — contactos vigentes, sin correo. */
export async function listOwnContacts(
  userId: number
): Promise<{ ok: true; contacts: ContactEntry[] }> {
  return { ok: true, contacts: await ProfilesRepository.listContacts(userId) };
}

/** GET /v1/social/blocks (FC209 F3) — a quién bloqueó el usuario. */
export async function listOwnBlocks(userId: number): Promise<{ ok: true; blocks: BlockEntry[] }> {
  return { ok: true, blocks: await ProfilesRepository.listBlocks(userId) };
}
