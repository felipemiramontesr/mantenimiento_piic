import React, { useCallback, useEffect, useState } from 'react';
import { Globe, Trash2 } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import usePermissions from '../../hooks/usePermissions';
import api from '../../api/client';
import ArchonDataTable, { ArchonTableHeader } from '../../components/UI/ArchonDataTable';
import {
  UniverseRow,
  CreateUniverseForm,
  DestroyUniverseModal,
} from './CosmologyModule/CosmologyForms';

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
  return { universes, loading, error, refetch };
}

const TypeBadge: React.FC<{ code: string }> = ({ code }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest bg-pinnacle-navy/10 text-pinnacle-navy">
    {code}
  </span>
);

interface UniverseTableRowProps {
  row: UniverseRow;
  onDestroy: (u: UniverseRow) => void;
}

/** Single table row — extracted so `UniversesTable` stays under budget. */
function UniverseTableRow({ row, onDestroy }: UniverseTableRowProps): React.ReactElement {
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
        <button
          type="button"
          onClick={(): void => onDestroy(row)}
          data-testid={`cosmology-universe-destroy-${row.id}`}
          className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-widest"
        >
          <Trash2 size={12} /> Destruir
        </button>
      </td>
    </tr>
  );
}

interface UniversesTableProps {
  universes: UniverseRow[];
  loading: boolean;
  error: boolean;
  onDestroy: (u: UniverseRow) => void;
}

function UniversesTable({
  universes,
  loading,
  error,
  onDestroy,
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
      renderRow={(row): React.ReactNode => <UniverseTableRow row={row} onDestroy={onDestroy} />}
    />
  );
}

interface UniversesDirectoryCardProps {
  universes: UniverseRow[];
  loading: boolean;
  error: boolean;
  onDestroy: (u: UniverseRow) => void;
}

/** Card wrapping the header + `UniversesTable` — extracted to keep `CosmologyModule` under budget. */
function UniversesDirectoryCard({
  universes,
  loading,
  error,
  onDestroy,
}: UniversesDirectoryCardProps): React.JSX.Element {
  return (
    <div
      className="card-archon-sovereign space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="cosmology-universes-directory"
    >
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <div className="w-8 h-8 rounded-[4px] bg-pinnacle-navy/10 flex items-center justify-center">
          <Globe size={16} className="text-pinnacle-navy" />
        </div>
        <div>
          <h2 className="text-archon-lg font-black text-pinnacle-navy uppercase tracking-widest">
            Universos Registrados
          </h2>
          <p className="text-archon-base text-pinnacle-navy/50 font-medium">
            Archon — Directorio de Universos activos
          </p>
        </div>
      </div>
      <UniversesTable universes={universes} loading={loading} error={error} onDestroy={onDestroy} />
    </div>
  );
}

/** Sovereign Layout header for this page — extracted to keep `CosmologyModule` under budget. */
function useCosmologySectionHeader(refetch: () => void): void {
  const { setSectionData } = useSovereignLayout();
  useEffect(() => {
    setSectionData(
      'Cosmología — Universos',
      'Crear, listar y destruir Universos del Multiverso Archon (§24.5 AUTORIDAD_Ω)',
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

/** FC161 F1 — root page for `/dashboard/cosmology`: list/create/destroy Universos. */
const CosmologyModule: React.FC = (): React.ReactElement => {
  const { isOmegaStrict } = usePermissions();
  const omega = isOmegaStrict();
  const { universes, loading, error, refetch } = useUniverses(omega);
  const [destroyTarget, setDestroyTarget] = useState<UniverseRow | null>(null);
  useCosmologySectionHeader(refetch);

  if (!omega) {
    return (
      <div className="animate-in fade-in duration-700">
        <div className="card-archon-sovereign text-center py-12 text-pinnacle-navy/40 text-sm font-medium">
          Sin acceso — sección exclusiva de GrayMan.
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container space-y-6">
          <CreateUniverseForm onCreated={refetch} />
          <UniversesDirectoryCard
            universes={universes}
            loading={loading}
            error={error}
            onDestroy={setDestroyTarget}
          />
        </div>
      </section>

      <DestroyUniverseModal
        universe={destroyTarget}
        onClose={(): void => setDestroyTarget(null)}
        onDestroyed={(): void => {
          setDestroyTarget(null);
          refetch();
        }}
      />
    </div>
  );
};

export default CosmologyModule;
