import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileX2,
} from 'lucide-react';
import { useContracts, Contract } from '../../hooks/useContracts';
import AT from '../../styles/archonTypography';

const STATUS_STYLES: Record<Contract['status'], { label: string; classes: string }> = {
  ACTIVE: { label: 'Activo', classes: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' },
  DRAFT: { label: 'Borrador', classes: 'bg-slate-800/60 text-slate-300 border-slate-700/40' },
  EXPIRED: { label: 'Vencido', classes: 'bg-amber-950/60 text-amber-400 border-amber-800/40' },
  CANCELLED: { label: 'Cancelado', classes: 'bg-red-950/60 text-red-400 border-red-800/40' },
};

const ContractsPanel: React.FC = () => {
  const { contracts, isLoading, error, refresh } = useContracts();
  const [query, setQuery] = useState('');

  const filtered = contracts.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div data-testid="contracts-panel" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className={AT.sectionTitle}>Contratos y SLAs</span>
        <button
          onClick={(): void => {
            refresh().catch(() => undefined);
          }}
          className="flex items-center gap-1.5 text-archon-sm font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar contrato..."
          value={query}
          onChange={(e): void => setQuery(e.target.value)}
          data-testid="contracts-search"
          className="w-full pl-9 pr-4 py-2 bg-[#0f2a44]/40 border border-white/10 rounded-lg text-archon-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-archon-blue/50"
        />
      </div>

      {isLoading && (
        <div data-testid="contracts-loading" className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-archon-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div
          data-testid="contracts-error"
          className="flex items-center gap-2 text-red-400 text-archon-sm font-black"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div
          data-testid="contracts-empty"
          className="flex flex-col items-center gap-2 py-8 text-slate-500"
        >
          <FileX2 className="w-8 h-8" />
          <span className={AT.sectionDescription}>No hay contratos registrados</span>
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div data-testid="contracts-grid" className="flex flex-col gap-3">
          {filtered.map((contract) => {
            const s = STATUS_STYLES[contract.status];
            return (
              <div
                key={contract.id}
                data-testid={`contract-card-${contract.id}`}
                className="flex items-start justify-between p-4 bg-[#0f2a44]/30 border border-white/10 rounded-xl hover:border-white/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-archon-blue mt-0.5 shrink-0" />
                  <div>
                    <p className={AT.cellValue}>{contract.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-archon-sm text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {contract.startDate} — {contract.endDate}
                      </span>
                      <span className="flex items-center gap-1 text-archon-sm text-slate-400">
                        <Clock className="w-3 h-3" />
                        SLA {contract.slaHours}h
                      </span>
                    </div>
                  </div>
                </div>
                <span className={`${AT.statusBadge} ${s.classes}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContractsPanel;
