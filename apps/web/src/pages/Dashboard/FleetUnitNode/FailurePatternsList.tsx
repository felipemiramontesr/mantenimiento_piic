import React, { useEffect, useState } from 'react';
import api from '../../../api/client';

export type FailurePattern = {
  failure_category: string;
  occurrence_count: number;
  affected_units: number;
  avg_km_at_failure: number | null;
  confidence_score: number;
  nhtsa_covered: boolean;
  signal_level: 'SEÑAL' | 'INVESTIGAR' | 'DATOS_INSUFICIENTES';
};

const SIGNAL_STYLES: Record<FailurePattern['signal_level'], string> = {
  SEÑAL: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  INVESTIGAR: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  DATOS_INSUFICIENTES: 'bg-white/5 text-gray-500 border border-white/10',
};

/**
 * Fetches internal fleet failure patterns for the "Patrones de Falla" tab.
 * FC142 F1 evidence note — inline HTTP call, not behind a hook: NOT part of
 * the 8 confirmed hooks migrated to the Zod-validated F4 client pattern in
 * this phase (Cond.R-142-H1 scopes hooks explicitly). Moved verbatim
 * (Cond.R-142-H2, no logic rewrite); flagged in 142_evidence/f1/ as a
 * residual candidate for a future pass, not silently fixed nor hidden.
 * FC158 T1 — renamed from VimPatternsList.tsx/useVimPatterns (2026-08-13):
 * this is fleet-internal failure-pattern intelligence, unrelated to the
 * universe/cosmology concept "VIM" was named after (already purged in
 * FC082 F0c). Cero cambio de comportamiento.
 */
export function useFailurePatterns(
  isOpen: boolean,
  activeTab: 'nhtsa' | 'patterns',
  make: string,
  model: string,
  year: number
): { results: FailurePattern[]; loading: boolean; error: string | null } {
  const [results, setResults] = useState<FailurePattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || activeTab !== 'patterns') return;
    setLoading(true);
    setError(null);
    api
      .get<{ success: boolean; data: FailurePattern[] }>(
        `/recalls/internal-patterns?make=${encodeURIComponent(make)}&model=${encodeURIComponent(
          model
        )}&year=${year}`
      )
      .then((res) => setResults(res.data.data))
      .catch(() => setError('No se pudieron cargar los patrones de falla.'))
      .finally(() => setLoading(false));
  }, [isOpen, activeTab, make, model, year]);

  return { results, loading, error };
}

function FailurePatternRow({ p }: { p: FailurePattern }): React.JSX.Element {
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
            SIGNAL_STYLES[p.signal_level]
          }`}
        >
          {p.signal_level === 'DATOS_INSUFICIENTES' ? 'DATOS INSUF.' : p.signal_level}
        </span>
      </div>
    </div>
  );
}

/** Fleet-internal failure-pattern list for the "Patrones de Falla" tab of the NHTSA modal. */
export function FailurePatternsList({
  loading,
  error,
  results,
}: {
  loading: boolean;
  error: string | null;
  results: FailurePattern[];
}): React.JSX.Element {
  return (
    <div>
      {loading && (
        <p className="text-gray-400 text-sm text-center py-4">Analizando patrones de falla…</p>
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
            <FailurePatternRow key={`${p.failure_category}-${i}`} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default FailurePatternsList;
