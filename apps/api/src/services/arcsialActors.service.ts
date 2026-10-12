import { PoolConnection } from 'mysql2/promise';
import db from './db';
import * as ActorsRepository from './arcsialActors.repository';
import * as FollowsRepository from './arcsialFollows.repository';
import { areContacts, isBlockedEitherWay } from './arcsialRelations.repository';
import { HANDLE_PATTERN, isReservedHandle, normalizeTenantHandle } from './arcsialHandle';
import { UniverseMutationError } from './universeLabel';
import { isDuplicateEntry } from './arcsialProfiles.service';
import type { ArcsialError } from './arcsialProfiles.service';
import type { UniverseMutationFailure } from './universeLabel';
import type { ActorCard, ActorProfilePatch, ArcsialActor } from './arcsialActors.repository';

/**
 * FC210 F2 — actores de Arcsial V2: perfil público por handle (404 opaco ante bloqueo), búsqueda por
 * nombre, edición de la presentación y alta del actor de un Universo nuevo. Un bloqueo solo esconde a
 * un actor USER: `arcsial_blocks` compara `users.id` y un Universo no tiene `user_id` (R 562_AN).
 */

export const ACTOR_NOT_FOUND: ArcsialError = {
  ok: false,
  status: 404,
  code: 'ACTOR_NOT_FOUND',
  message: 'No se encontró el perfil',
};

export const NOT_UNIVERSE_MASTER: ArcsialError = {
  ok: false,
  status: 403,
  code: 'FORBIDDEN_NOT_UNIVERSE_MASTER',
  message: 'Solo el Master of Universe puede actuar a nombre de su Universo',
};

/** ¿El usuario es el dueño del actor? La persona misma, o el MU del Universo. */
export function isActorOwner(actor: ArcsialActor, userId: number): boolean {
  return actor.actorType === 'USER' ? actor.userId === userId : actor.muUserId === userId;
}

/** ¿Hay un bloqueo, en cualquier sentido, que esconde al actor? Solo aplica a un actor USER. */
export async function isHiddenFrom(callerId: number, actor: ArcsialActor): Promise<boolean> {
  return actor.userId !== null && isBlockedEitherWay(callerId, actor.userId);
}

/** Actor por handle visible para el usuario: inexistente o con bloqueo en cualquier sentido ⇒ null. */
export async function findVisibleActor(
  callerId: number,
  handle: string
): Promise<ArcsialActor | null> {
  const actor = await ActorsRepository.findActorByHandle(handle);
  return actor && !(await isHiddenFrom(callerId, actor)) ? actor : null;
}

/**
 * El actor sobre el que actúa la sesión: el propio, o el del Universo si es su MU. `null` cuando el
 * Universo no existe o la sesión no es su MU (el llamador responde 403).
 */
export async function resolveActingActor(
  userId: number,
  asUniverseTenantId?: number
): Promise<ArcsialActor | null> {
  if (asUniverseTenantId === undefined) return ActorsRepository.findActorByUserId(userId);
  const actor = await ActorsRepository.findActorByTenantId(asUniverseTenantId);
  return actor && actor.muUserId === userId ? actor : null;
}

export interface ActorView {
  readonly id: number;
  readonly actorType: ArcsialActor['actorType'];
  readonly handle: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly bio: string | null;
  readonly followersCount: number;
  readonly followingCount: number;
  readonly isFollowedByMe: boolean;
  readonly isContact: boolean;
  /** Preferencia privada: solo viaja cuando quien consulta es el dueño del actor. */
  readonly isSearchable?: boolean;
}

/** Arma la vista pública con los contadores y la relación del visitante. */
async function buildActorView(callerId: number, actor: ArcsialActor): Promise<ActorView> {
  const [followersCount, followingCount, isFollowedByMe, isContact] = await Promise.all([
    FollowsRepository.countFollowers(actor.id),
    actor.userId === null ? 0 : FollowsRepository.countFollowing(actor.userId),
    FollowsRepository.isFollowing(callerId, actor.id),
    actor.userId === null ? false : areContacts(callerId, actor.userId),
  ]);
  return {
    id: actor.id,
    actorType: actor.actorType,
    handle: actor.handle,
    displayName: actor.displayName,
    avatarUrl: actor.avatarUrl,
    bio: actor.bio,
    followersCount,
    followingCount,
    isFollowedByMe,
    isContact,
    ...(isActorOwner(actor, callerId) ? { isSearchable: actor.isSearchable } : {}),
  };
}

/** GET /v1/social/actors/:handle — inexistente o bloqueado ⇒ el mismo 404. */
export async function getActor(
  callerId: number,
  handle: string
): Promise<({ ok: true } & ActorView) | ArcsialError> {
  const actor = await findVisibleActor(callerId, handle);
  if (!actor) return ACTOR_NOT_FOUND;
  return { ok: true, ...(await buildActorView(callerId, actor)) };
}

/** GET /v1/social/users/search — tarjetas públicas, sin contactos en común (R 551_AN). */
export async function searchActors(
  callerId: number,
  name: string
): Promise<{ ok: true; actors: ActorCard[] }> {
  return { ok: true, actors: await ActorsRepository.searchActorsByName(callerId, name) };
}

/** Escribe la presentación en el actor y, si es persona, su espejo en `arcsial_profiles`. */
async function writeProfile(
  actor: ArcsialActor,
  profile: Required<ActorProfilePatch>,
  connection: PoolConnection
): Promise<void> {
  await ActorsRepository.updateActorProfile(actor.id, profile, connection);
  if (actor.userId !== null) {
    await ActorsRepository.updateProfilePresentation(actor.userId, profile, connection);
  }
}

/** Ejecuta `work` en una TX: confirma al terminar y revierte si lanza. */
export async function inActorTransaction(
  work: (connection: PoolConnection) => Promise<void>
): Promise<void> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await work(connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export interface OwnActorProfile {
  readonly handle: string;
  readonly displayName: string;
  readonly bio: string | null;
  readonly avatarUrl: string | null;
  readonly isSearchable: boolean;
}

/**
 * PATCH /v1/social/actors/profile — sin Universo edita solo el actor de la sesión; con Universo, solo
 * su MU (403 si no). Los campos ausentes conservan su valor.
 */
export async function updateActorProfile(
  userId: number,
  patch: ActorProfilePatch,
  asUniverseTenantId?: number
): Promise<({ ok: true } & OwnActorProfile) | ArcsialError> {
  const actor = await resolveActingActor(userId, asUniverseTenantId);
  if (!actor) return asUniverseTenantId === undefined ? ACTOR_NOT_FOUND : NOT_UNIVERSE_MASTER;
  const profile: Required<ActorProfilePatch> = {
    displayName: patch.displayName ?? actor.displayName,
    bio: patch.bio === undefined ? actor.bio : patch.bio,
    avatarUrl: patch.avatarUrl === undefined ? actor.avatarUrl : patch.avatarUrl,
    isSearchable: patch.isSearchable ?? actor.isSearchable,
  };
  await inActorTransaction((connection) => writeProfile(actor, profile, connection));
  return { ok: true, handle: actor.handle, ...profile };
}

/** El handle de actor de un Universo nuevo no cumple el patrón, es reservado o ya está tomado. */
const UNIVERSE_HANDLE_UNAVAILABLE: UniverseMutationFailure = {
  status: 409,
  code: 'UNIVERSE_HANDLE_UNAVAILABLE',
  message: 'El handle del Universo no está disponible en Arcsial',
};

/**
 * Alta del actor UNIVERSE en la TX que crea el tenant. Si el handle normalizado no cumple
 * `[a-z0-9_]{3,30}`, es reservado o ya lo tiene otro actor, lanza y la TX completa revierte.
 */
export async function createActorForNewUniverse(
  tenant: { id: number; handle: string; label: string },
  connection: PoolConnection
): Promise<void> {
  const handle = normalizeTenantHandle(tenant.handle);
  if (!HANDLE_PATTERN.test(handle) || isReservedHandle(handle)) {
    throw new UniverseMutationError(UNIVERSE_HANDLE_UNAVAILABLE);
  }
  try {
    await ActorsRepository.insertUniverseActor(
      { tenantId: tenant.id, handle, displayName: tenant.label.slice(0, 100) },
      connection
    );
  } catch (error) {
    if (isDuplicateEntry(error)) throw new UniverseMutationError(UNIVERSE_HANDLE_UNAVAILABLE);
    throw error;
  }
}
