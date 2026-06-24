import React from 'react';
import { Phone, Mail, FileText, Users, RefreshCw, AlertCircle, ClipboardList } from 'lucide-react';
import { useInteractions, Interaction, InteractionType } from '../../hooks/useInteractions';
import AT from '../../styles/archonTypography';

const TYPE_CONFIG: Record<
  InteractionType,
  { icon: React.FC<{ className?: string }>; color: string; label: string }
> = {
  CALL: { icon: Phone, color: 'text-emerald-400', label: 'Llamada' },
  EMAIL: { icon: Mail, color: 'text-blue-400', label: 'Email' },
  NOTE: { icon: FileText, color: 'text-slate-400', label: 'Nota' },
  MEETING: { icon: Users, color: 'text-amber-400', label: 'Reunión' },
};

const InteractionRow: React.FC<{ item: Interaction }> = ({ item }) => {
  const cfg = TYPE_CONFIG[item.type];
  const Icon = cfg.icon;
  const date = new Date(item.createdAt).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      data-testid={`interaction-row-${item.id}`}
      className="flex items-start gap-3 p-3 bg-[#0a1929]/40 border border-white/10 rounded-lg hover:border-white/20 transition-colors"
    >
      <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-archon-sm font-black uppercase tracking-widest ${cfg.color}`}>
            {cfg.label}
          </span>
          <span className="text-archon-sm text-slate-500">{date}</span>
        </div>
        <p className={`${AT.cellValue} mt-1 break-words`}>{item.summary}</p>
      </div>
    </div>
  );
};

const InteractionsLog: React.FC = () => {
  const { interactions, isLoading, error, refresh } = useInteractions();

  return (
    <div data-testid="interactions-log" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-archon-blue" />
          <span className={AT.sectionTitle}>Bitácora Forense</span>
        </div>
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

      {isLoading && (
        <div data-testid="interactions-loading" className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-archon-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div
          data-testid="interactions-error"
          className="flex items-center gap-2 text-red-400 text-archon-sm font-black"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!isLoading && !error && interactions.length === 0 && (
        <div
          data-testid="interactions-empty"
          className="flex flex-col items-center gap-2 py-8 text-slate-500"
        >
          <ClipboardList className="w-8 h-8" />
          <span className={AT.sectionDescription}>No hay interacciones registradas</span>
        </div>
      )}

      {!isLoading && !error && interactions.length > 0 && (
        <div data-testid="interactions-list" className="flex flex-col gap-2">
          {interactions.map((item) => (
            <InteractionRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default InteractionsLog;
