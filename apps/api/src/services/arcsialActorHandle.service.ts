import * as ActorsRepository from './arcsialActors.repository';
import { isReservedHandle } from './arcsialHandle';
import { recordAuditLog } from './auditService';
import { ACTOR_NOT_FOUND, NOT_UNIVERSE_MASTER, inActorTransaction } from './arcsialActors.service';
import { isDuplicateEntry } from './arcsialProfiles.service';
import type { ArcsialError } from './arcsialProfiles.service';
import type { ArcsialActor } from './arcsialActors.repository';

/**
 * FC210 F2 (T2) — cambio de @handle en el espacio único de `arcsial_actors`, en el orden de la tabla:
 * W (reservado, 400) → K (tomado por otro actor, 409, sin renombres) → M (Universo solo por su MU,
 * 403). El formato (H, E) lo valida la ruta. El actor y, si es persona, su espejo en
 * `arcsial_profiles` cambian en la misma TX.
 */

const HANDLE_RESERVED: ArcsialError = {
  ok: false,
  status: 400,
  code: 'HANDLE_RESERVED',
  message: 'Ese handle está reservado por el sistema',
};

const HANDLE_TAKEN: ArcsialError = {
  ok: false,
  status: 409,
  code: 'HANDLE_ALREADY_TAKEN',
  message: 'Ese handle ya está en uso',
};

/** El actor cuyo handle se quiere cambiar, sin autorizar todavía. */
async function findTargetActor(
  userId: number,
  asUniverseTenantId?: number
): Promise<ArcsialActor | null> {
  return asUniverseTenantId === undefined
    ? ActorsRepository.findActorByUserId(userId)
    : ActorsRepository.findActorByTenantId(asUniverseTenantId);
}

/** M: una persona cambia el suyo; el de un Universo, solo su MU. Devuelve el actor o el rechazo. */
function authorizedActor(
  target: ArcsialActor | null,
  userId: number,
  asUniverse: boolean
): ArcsialActor | ArcsialError {
  if (!target) return asUniverse ? NOT_UNIVERSE_MASTER : ACTOR_NOT_FOUND;
  return asUniverse && target.muUserId !== userId ? NOT_UNIVERSE_MASTER : target;
}

/** Escribe el handle en el actor y en el perfil espejo; un choque tardío del índice único ⇒ 409. */
async function writeHandle(actor: ArcsialActor, handle: string): Promise<ArcsialError | null> {
  try {
    await inActorTransaction(async (connection) => {
      await ActorsRepository.updateActorHandle(actor.id, handle, connection);
      if (actor.userId !== null) {
        await ActorsRepository.updateProfileHandle(actor.userId, handle, connection);
      }
    });
    return null;
  } catch (error) {
    if (isDuplicateEntry(error)) return HANDLE_TAKEN;
    throw error;
  }
}

/** Deja el cambio en auditoría, sobre el usuario o sobre el Universo. */
async function auditHandleChange(
  actor: ArcsialActor,
  handle: string,
  userId: number
): Promise<void> {
  await recordAuditLog({
    entity_type: actor.tenantId === null ? 'user' : 'universe',
    entity_id: String(actor.tenantId ?? userId),
    action: 'UPDATE',
    snapshot_before: { handle: actor.handle },
    snapshot_after: { event: 'CHANGE_ARCIAL_HANDLE', handle },
    reason: 'CHANGE_ARCIAL_HANDLE — cambio de @handle de un actor de Arcsial (FC210 F2)',
    user_id: userId,
  });
}

/** PATCH /v1/social/actors/handle y /v1/social/profile/handle. */
export default async function changeActorHandle(
  userId: number,
  handle: string,
  asUniverseTenantId?: number
): Promise<{ ok: true; handle: string } | ArcsialError> {
  if (isReservedHandle(handle)) return HANDLE_RESERVED;
  const [holder, target] = await Promise.all([
    ActorsRepository.findActorByHandle(handle),
    findTargetActor(userId, asUniverseTenantId),
  ]);
  if (holder && holder.id !== target?.id) return HANDLE_TAKEN;
  const actor = authorizedActor(target, userId, asUniverseTenantId !== undefined);
  if ('ok' in actor) return actor;
  const failure = await writeHandle(actor, handle);
  if (failure) return failure;
  await auditHandleChange(actor, handle, userId);
  return { ok: true, handle };
}
