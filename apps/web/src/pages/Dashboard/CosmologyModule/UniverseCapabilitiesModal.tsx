import React, { useCallback, useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import ArchonModal from '../../../components/UI/ArchonModal';
import type { UniverseRow } from './CosmologyForms';
import {
  activateCluster,
  activateSupercluster,
  CapabilityState,
  ClusterView,
  describeCapabilityError,
  fetchUniverseClusters,
  fetchUniverseSuperclusters,
  suspendCluster,
  suspendSupercluster,
  SuperclusterView,
} from './cosmologyCapabilitiesApi';

/**
 * FC208 F1 (T1 · §24.5 AUTORIDAD_Ω) — gobernanza de Supercúmulos y Cúmulos de un Universo. Cada
 * Supercúmulo agrupa sus Cúmulos; un Supercúmulo que no está ACTIVE siempre ofrece «Activar», y los
 * botones de un Cúmulo solo se habilitan con el padre exactamente ACTIVE (el servidor respondería
 * 409 SUPERCLUSTER_NOT_ACTIVE). Durante una mutación en vuelo todos los botones se deshabilitan.
 */

export const PARENT_INACTIVE_HINT = 'El Supercúmulo padre debe estar activo (§24.5)';

interface Capabilities {
  readonly superclusters: SuperclusterView[];
  readonly clusters: ClusterView[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly busy: boolean;
  readonly reload: () => void;
  readonly run: (mutation: () => Promise<void>) => void;
}

type CapabilityLists = Omit<Capabilities, 'busy' | 'run'> & {
  readonly setError: (message: string | null) => void;
};

/** Carga Supercúmulos y Cúmulos del Universo; `reload` repite la carga (reintento o tras mutar). */
function useCapabilityLists(tenantId: number): CapabilityLists {
  const [superclusters, setSuperclusters] = useState<SuperclusterView[]>([]);
  const [clusters, setClusters] = useState<ClusterView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback((): void => {
    setLoading(true);
    setError(null);
    Promise.all([fetchUniverseSuperclusters(tenantId), fetchUniverseClusters(tenantId)])
      .then(([scs, cls]) => {
        setSuperclusters(scs);
        setClusters(cls);
      })
      .catch((err) => setError(describeCapabilityError(err)))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(reload, [reload]);

  return { superclusters, clusters, loading, error, reload, setError };
}

/** Las listas más mutaciones de una en una: al salir bien avisan (`onChanged`) y recargan. */
function useUniverseCapabilities(tenantId: number, onChanged: () => void): Capabilities {
  const { setError, ...lists } = useCapabilityLists(tenantId);
  const [busy, setBusy] = useState(false);

  const run = (mutation: () => Promise<void>): void => {
    setBusy(true);
    setError(null);
    mutation()
      .then(() => {
        onChanged();
        lists.reload();
      })
      .catch((err) => setError(describeCapabilityError(err)))
      .finally(() => setBusy(false));
  };

  return { ...lists, busy, run };
}

/** Acciones de los botones: según el estado actual, activar o suspender (T1). */
function capabilityToggles(
  caps: Capabilities,
  tenantId: number
): {
  toggleSupercluster: (sc: SuperclusterView) => void;
  toggleCluster: (cl: ClusterView) => void;
} {
  return {
    toggleSupercluster: (sc): void =>
      caps.run(() =>
        sc.state === 'ACTIVE'
          ? suspendSupercluster(tenantId, sc.code)
          : activateSupercluster(tenantId, sc.code)
      ),
    toggleCluster: (cl): void =>
      caps.run(() =>
        cl.state === 'ACTIVE'
          ? suspendCluster(tenantId, cl.code)
          : activateCluster(tenantId, cl.code)
      ),
  };
}

/** ACTIVO (esmeralda) solo para ACTIVE; SUSPENDIDO o INACTIVO (pizarra) para el resto. */
function StateBadge({ state }: { readonly state: CapabilityState }): React.JSX.Element {
  if (state === 'ACTIVE') {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
        Activo
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
      {state === 'SUSPENDED' ? 'Suspendido' : 'Inactivo'}
    </span>
  );
}

interface ClusterRowProps {
  readonly cluster: ClusterView;
  readonly parentActive: boolean;
  readonly busy: boolean;
  readonly onToggle: (cluster: ClusterView) => void;
}

/** Un Cúmulo: su botón solo se habilita con el Supercúmulo padre exactamente ACTIVE. */
function ClusterRow({ cluster, parentActive, busy, onToggle }: ClusterRowProps): React.JSX.Element {
  const active = cluster.state === 'ACTIVE';
  return (
    <li className="flex items-center justify-between gap-3 py-2 pl-4 text-xs">
      <span className="text-[#0f2a44]">
        {cluster.name} <span className="text-[#0f2a44]/40">[{cluster.code}]</span>
      </span>
      <span className="flex items-center gap-3">
        <StateBadge state={cluster.state} />
        <button
          type="button"
          disabled={!parentActive || busy}
          title={parentActive ? undefined : PARENT_INACTIVE_HINT}
          onClick={(): void => onToggle(cluster)}
          data-testid={`capability-cluster-toggle-${cluster.code}`}
          className="font-bold uppercase tracking-widest text-sky-700 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {active ? 'Suspender' : 'Activar'}
        </button>
      </span>
    </li>
  );
}

interface SuperclusterCardProps {
  readonly supercluster: SuperclusterView;
  readonly clusters: ClusterView[];
  readonly busy: boolean;
  readonly onToggleSupercluster: (supercluster: SuperclusterView) => void;
  readonly onToggleCluster: (cluster: ClusterView) => void;
}

/** Un Supercúmulo con su estado, su acción y sus Cúmulos hijos. */
function SuperclusterCard({
  supercluster,
  clusters,
  busy,
  onToggleSupercluster,
  onToggleCluster,
}: SuperclusterCardProps): React.JSX.Element {
  const active = supercluster.state === 'ACTIVE';
  return (
    <section
      className="rounded-lg border border-slate-200 p-4"
      data-testid={`capability-sc-${supercluster.code}`}
    >
      <header className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-[#0f2a44]">
          {supercluster.name} [{supercluster.code}]
        </h4>
        <span className="flex items-center gap-3">
          <StateBadge state={supercluster.state} />
          <button
            type="button"
            disabled={busy}
            onClick={(): void => onToggleSupercluster(supercluster)}
            data-testid={`capability-sc-toggle-${supercluster.code}`}
            className="text-xs font-bold uppercase tracking-widest text-sky-700 hover:text-sky-900 disabled:opacity-30"
          >
            {active ? 'Suspender Supercúmulo' : 'Activar Supercúmulo'}
          </button>
        </span>
      </header>
      <ul className="mt-2 divide-y divide-slate-100">
        {clusters.map((cluster) => (
          <ClusterRow
            key={cluster.code}
            cluster={cluster}
            parentActive={active}
            busy={busy}
            onToggle={onToggleCluster}
          />
        ))}
      </ul>
    </section>
  );
}

/** Carga, error con reintento, o la lista agrupada de Supercúmulos. */
function CapabilitiesBody({
  caps,
  tenantId,
}: {
  readonly caps: Capabilities;
  readonly tenantId: number;
}): React.JSX.Element {
  if (caps.loading && caps.superclusters.length === 0) {
    return <p data-testid="capabilities-loading">Cargando capacidades…</p>;
  }
  if (caps.superclusters.length === 0) {
    return (
      <button type="button" onClick={caps.reload} data-testid="capabilities-retry">
        Reintentar
      </button>
    );
  }
  const { toggleSupercluster, toggleCluster } = capabilityToggles(caps, tenantId);
  return (
    <div className="space-y-3">
      {caps.superclusters.map((sc) => (
        <SuperclusterCard
          key={sc.code}
          supercluster={sc}
          clusters={caps.clusters.filter((cl) => cl.superclusterCode === sc.code)}
          busy={caps.busy}
          onToggleSupercluster={toggleSupercluster}
          onToggleCluster={toggleCluster}
        />
      ))}
    </div>
  );
}

interface ContentProps {
  readonly universe: UniverseRow;
  readonly onClose: () => void;
  readonly onChanged: () => void;
}

/** Cuerpo del modal — montado solo con un Universo no nulo. */
function CapabilitiesContent({ universe, onClose, onChanged }: ContentProps): React.JSX.Element {
  const caps = useUniverseCapabilities(universe.id, onChanged);
  return (
    <ArchonModal
      isOpen
      onClose={onClose}
      maxWidth="max-w-3xl"
      ariaLabel="Gobernanza de Capacidades"
    >
      <div className="space-y-4 p-8" data-testid="universe-capabilities-modal">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-sky-700" />
          <h3 className="text-xl font-bold text-[#0f2a44]">
            Gobernanza de Capacidades — {universe.label}
          </h3>
        </div>
        <p className="text-sm text-[#0f2a44]/60">
          Supercúmulos y Cúmulos del Universo (§24.5 AUTORIDAD_Ω)
        </p>
        {caps.error && (
          <p
            role="alert"
            data-testid="capabilities-error"
            className="text-sm font-medium text-red-500"
          >
            {caps.error}
          </p>
        )}
        <CapabilitiesBody caps={caps} tenantId={universe.id} />
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold text-[#0f2a44]/60 hover:text-[#0f2a44]"
        >
          Cerrar
        </button>
      </div>
    </ArchonModal>
  );
}

/** Modal de capacidades — `universe: null` ⇒ cerrado (no monta nada). */
export default function UniverseCapabilitiesModal({
  universe,
  onClose,
  onChanged,
}: {
  readonly universe: UniverseRow | null;
  readonly onClose: () => void;
  readonly onChanged: () => void;
}): React.JSX.Element | null {
  if (!universe) return null;
  return (
    <CapabilitiesContent
      key={universe.id}
      universe={universe}
      onClose={onClose}
      onChanged={onChanged}
    />
  );
}
