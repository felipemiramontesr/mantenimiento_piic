import * as ActorsRepository from './arcsialActors.repository';
import * as FollowsRepository from './arcsialFollows.repository';
import { ACTOR_NOT_FOUND, isActorOwner, isHiddenFrom } from './arcsialActors.service';
import { isDuplicateEntry } from './arcsialProfiles.service';
import type { ArcsialError } from './arcsialProfiles.service';

/**
 * FC210 F2 (T1) — seguimiento unidireccional, en el orden de la tabla: A (el actor existe, 404) →
 * D (no es uno mismo, 400) → ¬B (sin bloqueo; si lo hay, el mismo 404 opaco) → ¬F (no lo seguía, 409).
 */

const CANNOT_FOLLOW_SELF: ArcsialError = {
  ok: false,
  status: 400,
  code: 'CANNOT_FOLLOW_SELF',
  message: 'No puedes seguirte a ti mismo',
};

const ALREADY_FOLLOWING: ArcsialError = {
  ok: false,
  status: 409,
  code: 'ALREADY_FOLLOWING',
  message: 'Ya sigues a este perfil',
};

/** POST /v1/social/actors/:handle/follow. */
export async function followActor(
  callerId: number,
  handle: string
): Promise<{ ok: true; following: true } | ArcsialError> {
  const actor = await ActorsRepository.findActorByHandle(handle);
  if (!actor) return ACTOR_NOT_FOUND;
  if (isActorOwner(actor, callerId)) return CANNOT_FOLLOW_SELF;
  if (await isHiddenFrom(callerId, actor)) return ACTOR_NOT_FOUND;
  try {
    await FollowsRepository.insertFollow(callerId, actor.id);
  } catch (error) {
    if (isDuplicateEntry(error)) return ALREADY_FOLLOWING;
    throw error;
  }
  return { ok: true, following: true };
}

/** DELETE /v1/social/actors/:handle/follow — dejar de seguir no depende de bloqueos; repetirlo no falla. */
export async function unfollowActor(
  callerId: number,
  handle: string
): Promise<{ ok: true; following: false } | ArcsialError> {
  const actor = await ActorsRepository.findActorByHandle(handle);
  if (!actor) return ACTOR_NOT_FOUND;
  await FollowsRepository.deleteFollow(callerId, actor.id);
  return { ok: true, following: false };
}
