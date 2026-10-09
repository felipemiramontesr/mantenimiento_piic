import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, Layers, Pencil, Trash2 } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import usePermissions from '../../hooks/usePermissions';
import api from '../../api/client';
import ArchonDataTable, { ArchonTableHeader } from '../../components/UI/ArchonDataTable';
import {
  UniverseRow,
  CreateUniverseForm,
  DestroyUniverseModal,
} from './CosmologyModule/CosmologyForms';
import RenameUniverseModal from './CosmologyModule/RenameUniverseModal';
import UniverseCapabilitiesModal from './CosmologyModule/UniverseCapabilitiesModal';
import SecurityEventsCard from './CosmologyModule/SecurityEvents/SecurityEventsCard';
import PlatformUsersCard from './CosmologyModule/PlatformUsers/PlatformUsersCard';

/**
 * FC161 F1 — Cosmology_Admin_Ui: Universes_List_Create_Destroy.
 * Reemplaza `UniversesDirectory.tsx`/`OnboardingModule.tsx` (llamaban a
 * `/onboarding/*`, retirado con 501 desde FC082 F3c3 — rotos en PROD) por la
 * API `/v1/cosmology/*` viva (FC160, cerrada en firme, OLR 3/3, Ω-exclusiva).
 * Gate: `isOmegaStrict()` (Cond.R-161-R2) — NO `isOmnipotent()`, que también
 * acepta `admin:role:edit` sin `'*'` y daría falsa sensación de acceso.
 */

const HEADERS: ArchonTableHeader[] = [
  { key: 'label', label: 'Universo', align: 'left' },
  { key: 'tipo', label: 'Tipo', align: 'left' },
  { key: 'sc', label: 'Supercúmulos activos', align: 'center' },
  { key: 'cl', label: 'Cúmulos activos', align: 'center' },
  { key: 'acciones', label: 'Acciones', align: 'right' },
];

/** Data hook — patrón `FailurePatternsList.tsx` (hook nombrado, no inline).
 *  `enabled=false` (actor no-Ω) evita el fetch por completo — la ruta 403earía
 *  de todos modos, pero no tiene sentido dispararla desde una UI que ya sabe
 *  que no tiene acceso. */
function useUniverses(enabled: boolean): {
  universes: UniverseRow[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
  renameLocal: (universeId: number, label: string) => void;
} {
  const [universes, setUniverses] = useState<UniverseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(false);
    api
      .get<{ success: boolean; data: UniverseRow[] }>('/cosmology/universes')
      .then((res) => {
        if (!cancelled) setUniverses(res.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return (): void => {
      cancelled = true;
    };
  }, [enabled, epoch]);

  const refetch = useCallback((): void => setEpoch((e) => e + 1), []);
  /** FC192 — refleja un renombrado en la lista sin recargar (el servidor ya guardó el nombre). */
  const renameLocal = useCallback((universeId: number, label: string): void => {
    setUniverses((current) => current.map((u) => (u.id === universeId ? { ...u, label } : u)));
  }, []);
  return { universes, loading, error, refetch, renameLocal };
}

const TypeBadge: React.FC<{ code: string }> = ({ code }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest bg-pinnacle-navy/10 text-pinnacle-navy">
    {code}
  </span>
);

/** Acciones de una fila; FC208 F2 suma «Cúmulos» (gobernanza de capacidades). */
interface UniverseActions {
  readonly onManageCapabilities: (u: UniverseRow) => void;
  readonly onRename: (u: UniverseRow) => void;
  readonly onDestroy: (u: UniverseRow) => void;
}

interface UniverseTableRowProps {
  readonly row: UniverseRow;
  readonly actions: UniverseActions;
}

/** Single table row — extracted so `UniversesTable` stays under budget. */
function UniverseTableRow({ row, actions }: UniverseTableRowProps): React.ReactElement {
  const { onManageCapabilities, onRename, onDestroy } = actions;
  return (
    <tr
      key={row.id}
      className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-xs"
      data-testid={`cosmology-universe-row-${row.id}`}
    >
      <td className="py-3 px-3 font-medium text-pinnacle-navy">{row.label}</td>
      <td className="py-3 px-3">
        <TypeBadge code={row.universeTypeCode} />
      </td>
      <td className="py-3 px-3 text-center text-pinnacle-navy/60">{row.activeSuperclusters}</td>
      <td className="py-3 px-3 text-center text-pinnacle-navy/60">{row.activeClusters}</td>
      <td className="py-3 px-3 text-right">
        <div className="inline-flex items-center gap-4">
          <button
            type="button"
            onClick={(): void => onManageCapabilities(row)}
            data-testid={`cosmology-universe-manage-${row.id}`}
            className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 text-xs font-bold uppercase tracking-widest"
          >
            <Layers size={12} /> Cúmulos
          </button>
          <button
            type="button"
            onClick={(): void => onRename(row)}
            data-testid={`cosmology-universe-rename-${row.id}`}
            className="inline-flex items-center gap-1 text-pinnacle-navy/70 hover:text-pinnacle-navy text-xs font-bold uppercase tracking-widest"
          >
            <Pencil size={12} /> Renombrar
          </button>
          <button
            type="button"
            onClick={(): void => onDestroy(row)}
            data-testid={`cosmology-universe-destroy-${row.id}`}
            className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-widest"
          >
            <Trash2 size={12} /> Destruir
          </button>
        </div>
      </td>
    </tr>
  );
}

interface UniversesTableProps {
  readonly universes: UniverseRow[];
  readonly loading: boolean;
  readonly error: boolean;
  readonly actions: UniverseActions;
}

function UniversesTable({
  universes,
  loading,
  error,
  actions,
}: UniversesTableProps): React.JSX.Element {
  if (error) {
    return (
      <div
        data-testid="cosmology-universes-error"
        className="py-8 text-center text-sm text-red-500"
      >
        Error al cargar los Universos. Intenta de nuevo.
      </div>
    );
  }
  return (
    <ArchonDataTable<UniverseRow>
      data={universes}
      headers={HEADERS}
      loading={loading}
      testId="cosmology-universes-table"
      variant="embedded"
      emptyMessage="No hay Universos registrados."
      renderRow={(row): React.ReactNode => <UniverseTableRow row={row} actions={actions} />}
    />
  );
}

/** Card wrapping the header + `UniversesTable` — extracted to keep `CosmologyModule` under budget. */
function UniversesDirectoryCard({
  universes,
  loading,
  error,
  actions,
}: UniversesTableProps): React.JSX.Element {
  return (
    <div
      className="card-archon-sovereign bg-white p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 [--card-accent:#0f2a44]"
      data-testid="cosmology-universes-directory"
    >
      <div className="card-sovereign-header">
        <Globe size={22} className="text-[var(--card-accent)]" />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">Universos Registrados</h3>
      </div>
      <UniversesTable universes={universes} loading={loading} error={error} actions={actions} />
    </div>
  );
}

/** Sovereign Layout header for this page — extracted to keep `CosmologyModule` under budget. */
function useCosmologySectionHeader(refetch: () => void): void {
  const { setSectionData } = useSovereignLayout();
  useEffect(() => {
    setSectionData(
      'Cosmología — Universos',
      'Crear, listar, renombrar y destruir Universos del Multiverso Archon (§24.5 AUTORIDAD_Ω)',
      null,
      {
        variant: 'yellow',
        headerTitle: 'Cosmología',
        HeaderIcon: Globe,
        PayloadIcon: Globe,
        actionTitle: 'Cosmología',
        description: 'Gobernanza de Universos',
        buttonText: 'Actualizar',
        isActive: false,
        onClick: refetch,
      }
    );
  }, [setSectionData, refetch]);
}

/** Consolas soberanas bajo los Universos: FC204 F4 usuarios de plataforma (todos los Universos e
 *  itinerantes) y FC201 F3 eventos de seguridad — agrupadas para mantener `CosmologyModule` bajo
 *  presupuesto. */
function SovereignConsoles({
  universes,
}: {
  readonly universes: UniverseRow[];
}): React.JSX.Element {
  return (
    <>
      <PlatformUsersCard universes={universes} />
      <SecurityEventsCard />
    </>
  );
}

interface UniverseTargets {
  readonly capabilities: UniverseRow | null;
  readonly rename: UniverseRow | null;
  readonly destroy: UniverseRow | null;
  readonly actions: UniverseActions;
  readonly close: () => void;
}

/** El Universo sobre el que se abrió cada modal (uno a la vez) y las acciones que los abren. */
function useUniverseTargets(): UniverseTargets {
  const [capabilities, setCapabilities] = useState<UniverseRow | null>(null);
  const [rename, setRename] = useState<UniverseRow | null>(null);
  const [destroy, setDestroy] = useState<UniverseRow | null>(null);
  const actions = useMemo(
    () => ({ onManageCapabilities: setCapabilities, onRename: setRename, onDestroy: setDestroy }),
    []
  );
  const close = useCallback((): void => {
    setCapabilities(null);
    setRename(null);
    setDestroy(null);
  }, []);
  return { capabilities, rename, destroy, actions, close };
}

interface UniverseModalsProps {
  readonly targets: UniverseTargets;
  readonly refetch: () => void;
  readonly renameLocal: (universeId: number, label: string) => void;
}

/** Modales de Cúmulos (FC208 F2: cada cambio recarga los contadores), renombrar y destruir. */
function UniverseModals({ targets, refetch, renameLocal }: UniverseModalsProps): React.JSX.Element {
  return (
    <>
      <UniverseCapabilitiesModal
        universe={targets.capabilities}
        onClose={targets.close}
        onChanged={refetch}
      />
      <RenameUniverseModal
        universe={targets.rename}
        onClose={targets.close}
        onRenamed={(universeId, label): void => {
          renameLocal(universeId, label);
          targets.close();
        }}
      />
      <DestroyUniverseModal
        universe={targets.destroy}
        onClose={targets.close}
        onDestroyed={(): void => {
          targets.close();
          refetch();
        }}
      />
    </>
  );
}

const NO_ACCESS = (
  <div className="animate-in fade-in duration-700">
    <div className="card-archon-sovereign text-center py-12 text-pinnacle-navy/40 text-sm font-medium">
      Sin acceso — sección exclusiva de GrayMan.
    </div>
  </div>
);

/** FC161 F1 — root page for `/dashboard/cosmology`: list/create/destroy Universos. */
const CosmologyModule: React.FC = (): React.ReactElement => {
  const { isOmegaStrict } = usePermissions();
  const omega = isOmegaStrict();
  const { universes, loading, error, refetch, renameLocal } = useUniverses(omega);
  const targets = useUniverseTargets();
  useCosmologySectionHeader(refetch);

  if (!omega) return NO_ACCESS;

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container space-y-6">
          <CreateUniverseForm onCreated={refetch} />
          <UniversesDirectoryCard
            universes={universes}
            loading={loading}
            error={error}
            actions={targets.actions}
          />
          <SovereignConsoles universes={universes} />
        </div>
      </section>
      <UniverseModals targets={targets} refetch={refetch} renameLocal={renameLocal} />
    </div>
  );
};

export default CosmologyModule;
