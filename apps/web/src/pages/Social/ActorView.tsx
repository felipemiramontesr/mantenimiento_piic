import React, { useCallback, useEffect, useState } from 'react';
import { UserCheck, UserPlus, Users } from 'lucide-react';
import { describeArcsialError, sendInvitation } from './arcsialApi';
import {
  ActorView as Actor,
  fetchActor,
  fetchWall,
  followActor,
  unfollowActor,
} from './arcsialCoreApi';
import ArcsialPostList, { ActorAvatar, ActorBadge } from './ArcsialPostList';
import PostComposer from './PostComposer';
import usePostPages from './usePostPages';

/**
 * FC210 F3 — perfil de un actor (persona o Universo): cabecera con contadores, «Seguir» / «Siguiendo»,
 * «Solicitar Contacto» (solo personas; invitación CONTACT de FC209) y su muro. En el perfil propio no
 * hay botones de relación y aparece la caja de publicación.
 */

interface ActorState {
  readonly actor: Actor | null;
  readonly error: string | null;
  readonly notice: string | null;
  readonly reload: () => void;
  readonly toggleFollow: (isFollowing: boolean) => void;
  readonly requestContact: () => void;
}

/** Carga el actor y expone sus acciones; cada acción recarga o deja el motivo del fallo. */
function useActor(handle: string): ActorState {
  const [actor, setActor] = useState<Actor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fail = (err: unknown): void => setError(describeArcsialError(err));
  const reload = useCallback((): void => {
    setError(null);
    fetchActor(handle).then(setActor).catch(fail);
  }, [handle]);
  useEffect(reload, [reload]);
  const toggleFollow = (isFollowing: boolean): void => {
    const act = isFollowing ? unfollowActor : followActor;
    act(handle).then(reload).catch(fail);
  };
  const requestContact = (): void => {
    sendInvitation(handle, 'CONTACT')
      .then(() => setNotice('Solicitud de contacto enviada.'))
      .catch(fail);
  };
  return { actor, error, notice, reload, toggleFollow, requestContact };
}

/** Seguidores y seguidos. */
function ActorCounters({ actor }: { readonly actor: Actor }): React.JSX.Element {
  return (
    <p className="flex items-center gap-4 text-xs text-[#0f2a44]/60" data-testid="actor-counters">
      <Users size={14} />
      <span>
        <strong className="text-[#0f2a44]">{actor.followersCount}</strong> seguidores
      </span>
      <span>
        <strong className="text-[#0f2a44]">{actor.followingCount}</strong> seguidos
      </span>
    </p>
  );
}

type LoadedActorState = ActorState & { actor: Actor };

/** «Seguir» / «Siguiendo». */
function FollowButton({ state }: { readonly state: LoadedActorState }): React.JSX.Element {
  const following = state.actor.isFollowedByMe;
  return (
    <button
      type="button"
      onClick={(): void => state.toggleFollow(following)}
      aria-pressed={following}
      data-testid="actor-follow"
      className={`text-xs ${following ? 'btn-sentinel-emerald' : 'btn-sentinel-sky'}`}
    >
      {following ? <UserCheck size={12} /> : <UserPlus size={12} />}
      {following ? 'Siguiendo' : 'Seguir'}
    </button>
  );
}

/** «Seguir» y, para una persona que aún no es contacto, «Solicitar Contacto». */
function ActorActions({ state }: { readonly state: LoadedActorState }): React.JSX.Element {
  const { actor } = state;
  return (
    <div className="flex flex-wrap gap-2">
      <FollowButton state={state} />
      {actor.actorType === 'USER' && !actor.isContact && (
        <button
          type="button"
          onClick={state.requestContact}
          data-testid="actor-request-contact"
          className="btn-sentinel-sky-static text-xs"
        >
          <UserPlus size={12} /> Solicitar Contacto
        </button>
      )}
    </div>
  );
}

/** Avatar, nombre, tipo y @handle. */
function ActorIdentity({ actor }: { readonly actor: Actor }): React.JSX.Element {
  return (
    <div className="flex items-center gap-4">
      <ActorAvatar actor={actor} large />
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-[#0f2a44]">
          {actor.displayName}
          <ActorBadge actorType={actor.actorType} />
        </h2>
        <p className="text-sm text-[#0f2a44]/50">@{actor.handle}</p>
      </div>
    </div>
  );
}

/** Cabecera del perfil. */
function ActorHeader({
  state,
  isOwn,
}: {
  readonly state: LoadedActorState;
  readonly isOwn: boolean;
}): React.JSX.Element {
  const { actor } = state;
  return (
    <header
      data-testid="actor-header"
      className="card-archon-sovereign space-y-3 bg-white p-6 [--card-accent:#0f2a44]"
    >
      <ActorIdentity actor={actor} />
      {actor.bio && <p className="whitespace-pre-wrap text-sm text-[#0f2a44]/80">{actor.bio}</p>}
      <ActorCounters actor={actor} />
      {!isOwn && <ActorActions state={state} />}
      {state.notice && (
        <output data-testid="actor-notice" className="block text-sm font-medium text-emerald-600">
          {state.notice}
        </output>
      )}
    </header>
  );
}

interface ActorViewProps {
  readonly handle: string;
  /** Handle del actor de la sesión; null mientras carga. */
  readonly ownHandle: string | null;
  /** Universo del que la sesión es MU (para la caja de publicación del muro propio). */
  readonly muUniverse: { id: number; label: string } | null;
  readonly onOpenActor: (handle: string) => void;
}

/** Perfil y muro de un actor. */
export default function ActorView(props: ActorViewProps): React.JSX.Element {
  const { handle, ownHandle } = props;
  const state = useActor(handle);
  const fetchPage = useCallback((beforeId: number | null) => fetchWall(handle, beforeId), [handle]);
  const pages = usePostPages(fetchPage);
  const isOwn = ownHandle === handle;
  const { actor } = state;
  return (
    <section className="flex flex-col gap-6" data-testid="actor-view">
      {state.error && (
        <p role="alert" data-testid="actor-error" className="text-sm font-medium text-red-500">
          {state.error}
        </p>
      )}
      {actor && <ActorHeader state={{ ...state, actor }} isOwn={isOwn} />}
      {isOwn && <PostComposer muUniverse={props.muUniverse} onPosted={pages.reload} />}
      {actor && (
        <ArcsialPostList
          pages={pages}
          emptyText="Sin publicaciones aún"
          onOpenActor={props.onOpenActor}
        />
      )}
    </section>
  );
}
