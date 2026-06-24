import React from 'react';
import { Kanban, DollarSign, BarChart2, RefreshCw, AlertCircle, Inbox } from 'lucide-react';
import { usePipeline, PipelineStage, Opportunity } from '../../hooks/usePipeline';
import AT from '../../styles/archonTypography';

const OpportunityCard: React.FC<{ opp: Opportunity }> = ({ opp }) => (
  <div
    data-testid={`opportunity-card-${opp.id}`}
    className="p-3 bg-[#0a1929]/60 border border-white/10 rounded-lg flex flex-col gap-2 hover:border-white/20 transition-colors"
  >
    <p className={AT.cellValue}>{opp.title}</p>
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1 text-archon-sm text-emerald-400 font-black">
        <DollarSign className="w-3 h-3" />
        {opp.valueMxn.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
      </span>
      <span className="flex items-center gap-1 text-archon-sm text-slate-400">
        <BarChart2 className="w-3 h-3" />
        {opp.probabilityPct}%
      </span>
    </div>
  </div>
);

const StageColumn: React.FC<{ stage: PipelineStage }> = ({ stage }) => (
  <div
    data-testid={`stage-column-${stage.code}`}
    className="flex flex-col gap-3 min-w-[220px] max-w-[220px]"
  >
    <div className="flex items-center justify-between pb-2 border-b border-white/10">
      <span
        className="text-archon-sm font-black uppercase tracking-widest"
        style={{ color: stage.color }}
      >
        {stage.label}
      </span>
      <span className="text-archon-sm text-slate-500 font-black">{stage.opportunities.length}</span>
    </div>
    <div className="flex flex-col gap-2">
      {stage.opportunities.map((opp) => (
        <OpportunityCard key={opp.id} opp={opp} />
      ))}
      {stage.opportunities.length === 0 && (
        <div className="flex flex-col items-center gap-1 py-4 text-slate-600">
          <Inbox className="w-5 h-5" />
          <span className={AT.sectionDescription}>Vacío</span>
        </div>
      )}
    </div>
  </div>
);

const PipelineBoard: React.FC = () => {
  const { stages, isLoading, error, refresh } = usePipeline();

  const totalOpps = stages.reduce((acc, s) => acc + s.opportunities.length, 0);

  return (
    <div data-testid="pipeline-board" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Kanban className="w-4 h-4 text-archon-blue" />
          <span className={AT.sectionTitle}>Pipeline de Negociaciones</span>
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
        <div data-testid="pipeline-loading" className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-archon-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div
          data-testid="pipeline-error"
          className="flex items-center gap-2 text-red-400 text-archon-sm font-black"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!isLoading && !error && totalOpps === 0 && (
        <div
          data-testid="pipeline-empty"
          className="flex flex-col items-center gap-2 py-12 text-slate-500"
        >
          <Kanban className="w-8 h-8" />
          <span className={AT.sectionDescription}>No hay oportunidades en el pipeline</span>
        </div>
      )}

      {!isLoading && !error && (
        <div data-testid="pipeline-columns" className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <StageColumn key={stage.id} stage={stage} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PipelineBoard;
