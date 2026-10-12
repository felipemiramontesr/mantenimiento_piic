import React, { useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { describeArcsialError } from './arcsialApi';
import { ActorCard, followActor, searchActors, SEARCH_NAME_MIN } from './arcsialCoreApi';
import { ActorAvatar, ActorBadge } from './ArcsialPostList';

/**
 * FC210 F3 — buscador por nombre con resolución de homónimos. Se dispara SOLO con Enter o con el botón
 * (nunca al teclear): cada búsqueda gasta una de las 20 por hora. Un texto con `@` o de menos de 3
 * caracteres se rechaza aquí, sin gastar cuota. Cada resultado se distingue por su @handle único.
 */

interface SearchState {
  readonly query: string;
  readonly setQuery: (value: string) => void;
  readonly results: ActorCard[] | null;
  readonly error: string | null;
  readonly followed: ReadonlySet<string>;
  readonly search: () => void;
  readonly follow: (handle: string) => void;
  readonly close: () => void;
}

/** Código del rechazo local de la consulta, en el mismo orden que el servidor: `@`, luego longitud. */
function localRejection(name: string): string | null {
  if (name.includes('@')) return 'INVALID_SEARCH_QUERY';
  return name.length < SEARCH_NAME_MIN ? 'QUERY_TOO_SHORT' : null;
}

/** Estado de la búsqueda y del seguimiento rápido desde los resultados. */
function useActorSearch(): SearchState {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ActorCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followed, setFollowed] = useState<ReadonlySet<string>>(new Set());
  const fail = (err: unknown): void => setError(describeArcsialError(err));
  const search = (): void => {
    const name = query.trim();
    const code = localRejection(name);
    setError(code ? describeArcsialError({ response: { data: { code } } }) : null);
    if (code) return;
    searchActors(name).then(setResults).catch(fail);
  };
  const follow = (handle: string): void => {
    followActor(handle)
      .then(() => setFollowed((current) => new Set(current).add(handle)))
      .catch(fail);
  };
  return {
    query,
    setQuery,
    results,
    error,
    followed,
    search,
    follow,
    close: (): void => setResults(null),
  };
}

interface SearchResultProps {
  readonly actor: ActorCard;
  readonly state: SearchState;
  readonly onOpenActor: (handle: string) => void;
}

/** Avatar, nombre, tipo y @handle de un resultado: al pulsarlo abre su perfil. */
function ResultIdentity({
  actor,
  onOpenActor,
}: Omit<SearchResultProps, 'state'>): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={(): void => onOpenActor(actor.handle)}
      data-testid={`search-open-${actor.handle}`}
      className="flex items-center gap-3 text-left"
    >
      <ActorAvatar actor={actor} />
      <span>
        <span className="flex items-center gap-2 font-bold text-[#0f2a44]">
          {actor.displayName}
          <ActorBadge actorType={actor.actorType} />
        </span>
        <span className="text-xs text-[#0f2a44]/50">@{actor.handle}</span>
      </span>
    </button>
  );
}

/** Un homónimo con su «Seguir» rápido. */
function SearchResult({ actor, state, onOpenActor }: SearchResultProps): React.JSX.Element {
  const isFollowed = state.followed.has(actor.handle);
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <ResultIdentity actor={actor} onOpenActor={onOpenActor} />
      <button
        type="button"
        disabled={isFollowed}
        onClick={(): void => state.follow(actor.handle)}
        data-testid={`search-follow-${actor.handle}`}
        className="btn-sentinel-sky-static text-xs disabled:opacity-50"
      >
        <UserPlus size={12} /> {isFollowed ? 'Siguiendo' : 'Seguir'}
      </button>
    </li>
  );
}

/** Encabezado de la tarjeta: cuántos resultados y el botón de cierre. */
function ResultsHeader({
  count,
  onClose,
}: {
  readonly count: number;
  readonly onClose: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-black uppercase tracking-widest text-[#0f2a44]/40">
        {count === 0 ? 'Sin resultados' : `${count} resultado(s)`}
      </h3>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar resultados"
        data-testid="actor-search-close"
      >
        <X size={14} className="text-[#0f2a44]/40 hover:text-[#0f2a44]" />
      </button>
    </div>
  );
}

/** Tarjeta emergente con los resultados. */
function SearchResults({
  state,
  onOpenActor,
}: {
  readonly state: SearchState;
  readonly onOpenActor: (handle: string) => void;
}): React.JSX.Element | null {
  const { results } = state;
  if (results === null) return null;
  return (
    <div
      data-testid="actor-search-results"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
    >
      <ResultsHeader count={results.length} onClose={state.close} />
      <ul className="divide-y divide-slate-100">
        {results.map((actor) => (
          <SearchResult key={actor.handle} actor={actor} state={state} onOpenActor={onOpenActor} />
        ))}
      </ul>
    </div>
  );
}

/** Campo y botón: la búsqueda solo se dispara con Enter o con el botón. */
function SearchField({ state }: { readonly state: SearchState }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <input
        value={state.query}
        onChange={(e): void => state.setQuery(e.target.value)}
        onKeyDown={(e): void => {
          if (e.key === 'Enter') state.search();
        }}
        placeholder="Buscar personas o universos por nombre"
        aria-label="Buscar por nombre"
        data-testid="actor-search-input"
        className="archon-input flex-1"
      />
      <button
        type="button"
        onClick={state.search}
        data-testid="actor-search-submit"
        className="btn-sentinel-sky-static text-xs"
      >
        <Search size={12} /> Buscar
      </button>
    </div>
  );
}

/** Buscador de personas y universos por nombre. */
export default function ActorSearch({
  onOpenActor,
}: {
  readonly onOpenActor: (handle: string) => void;
}): React.JSX.Element {
  const state = useActorSearch();
  const open = (handle: string): void => {
    state.close();
    onOpenActor(handle);
  };
  return (
    <div className="space-y-2" data-testid="actor-search">
      <SearchField state={state} />
      {state.error && (
        <p
          role="alert"
          data-testid="actor-search-error"
          className="text-sm font-medium text-red-500"
        >
          {state.error}
        </p>
      )}
      <SearchResults state={state} onOpenActor={open} />
    </div>
  );
}
