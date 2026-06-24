import React, { useCallback, useEffect, useState } from 'react';
import { Search, Star, Phone, MapPin, ExternalLink, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import AT from '../../styles/archonTypography';

interface TallerEntry {
  id: number;
  label: string;
  razonSocial: string | null;
  especialidades: string | null;
  telefono: string | null;
  direccion: string | null;
  avgRating: number;
  reviewCount: number;
}

function StarBar({ value }: { value: number }): React.ReactElement {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3 h-3 ${
            n <= rounded ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

const TalleresDirectory: React.FC = () => {
  const { setSectionData } = useSovereignLayout();
  const [talleres, setTalleres] = useState<TallerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const fetchDirectory = useCallback(async (query: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const url = query ? `/social/directory?q=${encodeURIComponent(query)}` : '/social/directory';
      const res = await api.get<{ talleres: TallerEntry[] }>(url);
      setTalleres(res.data.talleres);
    } catch {
      setError('Error al cargar el directorio');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setSectionData('Directorio de Talleres', 'Centros Especializados con reputación verificada');
    fetchDirectory('').catch(() => undefined);
  }, [setSectionData, fetchDirectory]);

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    fetchDirectory(q).catch(() => undefined);
  };

  return (
    <div data-testid="talleres-directory" className="flex flex-col gap-6 max-w-3xl mx-auto py-6">
      {/* Search */}
      <form data-testid="directory-search-form" onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
          <input
            data-testid="directory-search-input"
            value={q}
            onChange={(e): void => setQ(e.target.value)}
            placeholder="Buscar taller o nombre…"
            className="w-full pl-9 pr-3 py-2 text-archon-sm text-[#0f2a44] bg-white border border-[#0f2a44]/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f2a44]/30 placeholder:text-slate-300"
          />
        </div>
        <button
          type="submit"
          data-testid="directory-search-btn"
          className="flex items-center gap-1.5 px-3 py-2 bg-[#0f2a44]/10 hover:bg-[#0f2a44]/20 text-[#0f2a44] text-archon-xs font-black uppercase tracking-widest rounded-lg transition-all"
        >
          Buscar
        </button>
      </form>

      {/* Loading */}
      {isLoading && (
        <div data-testid="directory-loading" className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-archon-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          data-testid="directory-error"
          className="flex items-center gap-2 text-red-400 text-archon-sm font-black"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Directory list */}
      {!isLoading && !error && (
        <div data-testid="directory-list" className="flex flex-col gap-3">
          {talleres.length === 0 && (
            <p
              data-testid="directory-empty"
              className="text-archon-xs text-slate-400 uppercase tracking-widest text-center py-10"
            >
              Sin resultados
            </p>
          )}
          {talleres.map((taller) => (
            <div
              key={taller.id}
              data-testid={`taller-card-${taller.id}`}
              className="flex flex-col gap-2 p-4 bg-white border border-[#0f2a44]/10 rounded-xl hover:shadow-sm transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className={AT.sectionTitle}>{taller.label}</span>
                  {taller.razonSocial && (
                    <span className="text-archon-xs text-slate-400 uppercase tracking-widest">
                      {taller.razonSocial}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StarBar value={taller.avgRating} />
                  <span className="text-archon-xs font-black text-amber-500 uppercase tracking-widest">
                    {taller.avgRating > 0 ? taller.avgRating.toFixed(1) : 'Sin reseñas'}
                  </span>
                </div>
              </div>

              {/* Specialties */}
              {taller.especialidades && (
                <div className="flex flex-wrap gap-1">
                  {taller.especialidades.split(',').map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 bg-[#0f2a44]/5 text-[#0f2a44]/70 text-archon-xs font-black uppercase tracking-widest rounded-full"
                    >
                      {s.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Contact + Ver perfil */}
              <div className="flex items-center justify-between gap-2 mt-1">
                <div className="flex items-center gap-3 text-slate-400">
                  {taller.telefono && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span className="text-archon-xs">{taller.telefono}</span>
                    </div>
                  )}
                  {taller.direccion && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="text-archon-xs">{taller.direccion}</span>
                    </div>
                  )}
                </div>
                <button
                  data-testid={`taller-view-btn-${taller.id}`}
                  className="flex items-center gap-1 text-archon-xs font-black uppercase tracking-widest text-[#0f2a44]/60 hover:text-[#0f2a44] transition-colors"
                  onClick={(): void => undefined}
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver Perfil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TalleresDirectory;
