import React, { useEffect, useState } from 'react';
import { List } from 'lucide-react';
import api from '../../api/client';

interface UniverseRow {
  owner_id: number;
  owner_type: 'FLOTILLA' | 'CENTER';
  suite: 'ERP' | 'VIM';
  label: string;
  user_id: number;
  username: string;
  full_name: string;
  is_active: number;
  rfc: string | null;
  razon_social: string | null;
  telefono: string | null;
}

const SuiteBadge: React.FC<{ suite: 'ERP' | 'VIM' }> = ({ suite }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest ${
      suite === 'ERP'
        ? 'bg-pinnacle-navy/10 text-pinnacle-navy'
        : 'bg-pinnacle-yellow/20 text-pinnacle-navy/70'
    }`}
  >
    {suite}
  </span>
);

const UniversesDirectory: React.FC = (): React.ReactElement => {
  const [rows, setRows] = useState<UniverseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api
      .get<{ success: boolean; data: UniverseRow[] }>('/onboarding/universes')
      .then((res) => {
        if (!cancelled) setRows(res.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="card-archon-sovereign space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="universes-directory"
    >
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <div className="w-8 h-8 rounded-[4px] bg-pinnacle-navy/10 flex items-center justify-center">
          <List size={16} className="text-pinnacle-navy" />
        </div>
        <div>
          <h2 className="text-archon-lg font-black text-pinnacle-navy uppercase tracking-widest">
            Universos Registrados
          </h2>
          <p className="text-archon-base text-pinnacle-navy/50 font-medium">
            Archon — Directorio de universos activos
          </p>
        </div>
      </div>

      {loading && (
        <div data-testid="universes-directory-loading" className="space-y-2 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-[4px] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div
          data-testid="universes-directory-error"
          className="py-8 text-center text-sm text-red-500 font-medium"
        >
          Error al cargar los universos. Intenta de nuevo.
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div
          data-testid="universes-directory-empty"
          className="py-8 text-center text-sm text-pinnacle-navy/40 font-medium uppercase tracking-widest"
        >
          No hay universos registrados.
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" data-testid="universes-table">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-2 text-left font-black uppercase tracking-widest text-pinnacle-navy/40 pr-4">
                  Tipo
                </th>
                <th className="pb-2 text-left font-black uppercase tracking-widest text-pinnacle-navy/40 pr-4">
                  Razón Social
                </th>
                <th className="pb-2 text-left font-black uppercase tracking-widest text-pinnacle-navy/40 pr-4">
                  Usuario Root
                </th>
                <th className="pb-2 text-left font-black uppercase tracking-widest text-pinnacle-navy/40 pr-4">
                  RFC
                </th>
                <th className="pb-2 text-left font-black uppercase tracking-widest text-pinnacle-navy/40">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.owner_id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  data-testid={`universe-row-${row.owner_id}`}
                >
                  <td className="py-3 pr-4">
                    <SuiteBadge suite={row.suite} />
                  </td>
                  <td className="py-3 pr-4 font-medium text-pinnacle-navy">
                    {row.razon_social ?? row.label}
                  </td>
                  <td className="py-3 pr-4 text-pinnacle-navy/60">{row.username}</td>
                  <td className="py-3 pr-4 text-pinnacle-navy/60 font-mono">{row.rfc ?? '—'}</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest ${
                        row.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {row.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UniversesDirectory;
