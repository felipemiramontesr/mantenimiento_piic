import React, { useState } from 'react';
import { Globe, Search, Users } from 'lucide-react';
import ArchonField from '../../../../components/ArchonField';
import ArchonSelect from '../../../../components/ArchonSelect';
import type { UniverseRow } from '../CosmologyForms';
import type { PlatformUser, PlatformUserScope } from './platformUsersApi';
import usePlatformUsers, { PlatformUsersState } from './usePlatformUsers';
import PlatformUsersTable from './PlatformUsersTable';
import SovereignUserActionModal, {
  SovereignAction,
  SovereignActionTarget,
} from './SovereignUserActionModal';

/**
 * FC204 F4 — Consola de Usuarios de Plataforma (solo Ω, §24.5): todos los cosmonautas con el
 * Universo al que pertenecen, filtro por Universo o itinerantes, búsqueda y las dos acciones
 * soberanas (restablecer 2FA y eliminar) detrás de la confirmación nominal del Universo.
 */

const ALL = 'all';
const ITINERANT = 'itinerant';

/** El valor del selector ↔ el filtro de la API. */
function scopeFromOption(value: string): PlatformUserScope {
  if (value === ALL) return '';
  if (value === ITINERANT) return 'itinerant';
  return Number(value);
}

/** Opciones del selector: todos, itinerantes y un renglón por Universo. */
function scopeOptions(universes: UniverseRow[]): { value: string; label: string }[] {
  return [
    { value: ALL, label: 'Todos los Universos' },
    { value: ITINERANT, label: 'Itinerantes (sin Universo)' },
    ...universes.map((u) => ({ value: String(u.id), label: u.label })),
  ];
}

/** Selector de Universo + búsqueda (se aplica al enviar, no en cada tecla). */
function PlatformUsersFilters({
  state,
  universes,
}: {
  readonly state: PlatformUsersState;
  readonly universes: UniverseRow[];
}): React.JSX.Element {
  const [draft, setDraft] = useState(state.search);
  const selected = state.scope === '' ? ALL : String(state.scope);
  return (
    <form
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      data-testid="platform-users-filters"
      onSubmit={(e): void => {
        e.preventDefault();
        state.setSearch(draft);
      }}
    >
      <ArchonField label="Universo" icon={Globe}>
        <ArchonSelect
          options={scopeOptions(universes)}
          value={selected}
          onChange={(value): void => state.setScope(scopeFromOption(value))}
        />
      </ArchonField>
      <ArchonField label="Buscar (nombre, usuario o RFC)" icon={Search}>
        <input
          value={draft}
          maxLength={100}
          onChange={(e): void => setDraft(e.target.value)}
          data-testid="platform-users-search"
          className="archon-input"
        />
      </ArchonField>
    </form>
  );
}

/** Anterior / siguiente con el total de filas. */
function PlatformUsersPager({ state }: { readonly state: PlatformUsersState }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between text-xs text-pinnacle-navy/60">
      <span data-testid="platform-users-total">{state.total} usuario(s)</span>
      <div className="inline-flex items-center gap-4">
        <button
          type="button"
          disabled={state.page <= 1}
          onClick={(): void => state.setPage(state.page - 1)}
          data-testid="platform-users-prev"
          className="font-bold uppercase tracking-widest disabled:opacity-30"
        >
          Anterior
        </button>
        <span data-testid="platform-users-page">
          {state.page} / {state.pageCount}
        </span>
        <button
          type="button"
          disabled={state.page >= state.pageCount}
          onClick={(): void => state.setPage(state.page + 1)}
          data-testid="platform-users-next"
          className="font-bold uppercase tracking-widest disabled:opacity-30"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

/** Tarjeta de la consola. `universes` alimenta el selector (ya los carga `CosmologyModule`). */
export default function PlatformUsersCard({
  universes,
}: {
  readonly universes: UniverseRow[];
}): React.JSX.Element {
  const state = usePlatformUsers();
  const [target, setTarget] = useState<SovereignActionTarget | null>(null);
  const onAction = (user: PlatformUser, action: SovereignAction): void =>
    setTarget({ user, action });

  return (
    <div
      className="card-archon-sovereign bg-white p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 [--card-accent:#0f2a44]"
      data-testid="platform-users-card"
    >
      <div className="card-sovereign-header">
        <Users size={22} className="text-[var(--card-accent)]" />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">Usuarios de Plataforma</h3>
      </div>
      <PlatformUsersFilters state={state} universes={universes} />
      {state.error ? (
        <p className="text-sm text-red-500" data-testid="platform-users-error">
          Error al cargar los usuarios. Intenta de nuevo.
        </p>
      ) : (
        <PlatformUsersTable users={state.users} loading={state.loading} onAction={onAction} />
      )}
      <PlatformUsersPager state={state} />
      <SovereignUserActionModal
        target={target}
        onClose={(): void => setTarget(null)}
        onDone={(): void => {
          setTarget(null);
          state.refetch();
        }}
      />
    </div>
  );
}
