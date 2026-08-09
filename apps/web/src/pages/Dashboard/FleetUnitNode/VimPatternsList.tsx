import React, { useEffect, useState } from 'react';
import api from '../../../api/client';

export type VimPattern = {
  failure_category: string;
  occurrence_count: number;
  affected_units: number;
  avg_km_at_failure: number | null;
  confidence_score: number;
  nhtsa_covered: boolean;
  signal_level: 'SEÑAL' | 'INVESTIGAR' | 'DATOS_INSUFICIENTES';
};

const VIM_SIGNAL_STYLES: Record<VimPattern['signal_level'], string> = {
  SEÑAL: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  INVESTIGAR: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  DATOS_INSUFICIENTES: 'bg-white/5 text-gray-500 border border-white/10',
};

/**
 * Fetches VIM-derived failure patterns for the "Patrones VIM" tab.
 * FC142 F1 evidence note — inline HTTP call, not behind a hook: NOT part of
 * the 8 confirmed hooks migrated to the Zod-validated F4 client pattern in
 * this phase (Cond.R-142-H1 scopes hooks explicitly). Moved verbatim
 * (Cond.R-142-H2, no logic rewrite); flagged in 142_evidence/f1/ as a
 * residual candidate for a future pass, not silently fixed nor hidden.
 */
export function useVimPatterns(
  isOpen: boolean,
  activeTab: 'nhtsa' | 'vim',
  make: string,
  model: string,
  year: number
): { vimResults: VimPattern[]; vimLoading: boolean; vimError: string | null } {
  const [vimResults, setVimResults] = useState<VimPattern[]>([]);
  const [vimLoading, setVimLoading] = useState(false);
  const [vimError, setVimError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || activeTab !== 'vim') return;
    setVimLoading(true);
    setVimError(null);
    api
      .get<{ success: boolean; data: VimPattern[] }>(
        `/recalls/vim-patterns?make=${encodeURIComponent(make)}&model=${encodeURIComponent(
          model
        )}&year=${year}`
      )
      .then((res) => setVimResults(res.data.data))
      .catch(() => setVimError('No se pudieron cargar los patrones VIM.'))
      .finally(() => setVimLoading(false));
  }, [isOpen, activeTab, make, model, year]);

  return { vimResults, vimLoading, vimError };
}

function VimPatternRow({ p }: { p: VimPattern }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-white/5 rounded-[4px]">
      <div className="flex-1 min-w-0">
        <p className="text-archon-xs font-black text-amber-300 uppercase tracking-widest">
          {p.failure_category}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {p.affected_units} unidades ·{' '}
          {p.avg_km_at_failure != null
            ? `${p.avg_km_at_failure.toLocaleString()} km prom.`
            : 'km N/D'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {p.nhtsa_covered && (
          <span
            title="Cubierto por recall NHTSA"
            className="text-xs text-sky-400 font-black uppercase tracking-widest border border-sky-400/40 rounded-[2px] px-1.5 py-0.5"
          >
            NHTSA
          </span>
        )}
        <span
          className={`text-xs font-black uppercase tracking-widest rounded-[2px] px-2 py-0.5 ${
            VIM_SIGNAL_STYLES[p.signal_level]
          }`}
        >
          {p.signal_level === 'DATOS_INSUFICIENTES' ? 'DATOS INSUF.' : p.signal_level}
        </span>
      </div>
    </div>
  );
}

/** VIM-derived failure-pattern list for the "Patrones VIM" tab of the NHTSA modal. */
export function VimPatternsList({
  loading,
  error,
  results,
}: {
  loading: boolean;
  error: string | null;
  results: VimPattern[];
}): React.JSX.Element {
  return (
    <div>
      {loading && (
        <p className="text-gray-400 text-sm text-center py-4">Analizando patrones VIM…</p>
      )}
      {error && <p className="text-red-400 text-sm text-center py-4">{error}</p>}
      {!loading && !error && results.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">
          Sin patrones de falla detectados para este modelo/año.
        </p>
      )}
      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {results.map((p, i) => (
            <VimPatternRow key={`${p.failure_category}-${i}`} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default VimPatternsList;
