import React, { useEffect } from 'react';
import { Mail, Send, RefreshCw, AlertCircle, Inbox, Clock, FileText } from 'lucide-react';
import { useCampaigns, type CampaignType } from '../../hooks/useCampaigns';
import AT from '../../styles/archonTypography';

const TYPE_LABEL: Record<CampaignType, string> = {
  CONTRACT_EXPIRY: 'Vencimiento Contrato',
  MAINTENANCE_REMINDER: 'Recordatorio Mantenimiento',
  QUOTATION: 'Cotización',
};

const TYPE_COLOR: Record<CampaignType, string> = {
  CONTRACT_EXPIRY: 'text-red-400',
  MAINTENANCE_REMINDER: 'text-amber-400',
  QUOTATION: 'text-archon-blue',
};

const CampaignsPanel: React.FC = () => {
  const { campaigns, isLoading, error, refresh, sendCampaign } = useCampaigns();

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return (
    <div data-testid="campaigns-panel" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-archon-blue" />
          <span className={AT.sectionTitle}>Campañas de Correo</span>
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
        <div data-testid="campaigns-loading" className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-archon-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div
          data-testid="campaigns-error"
          className="flex items-center gap-2 text-red-400 text-archon-sm font-black"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!isLoading && !error && campaigns.length === 0 && (
        <div
          data-testid="campaigns-empty"
          className="flex flex-col items-center gap-2 py-10 text-slate-500"
        >
          <Inbox className="w-6 h-6" />
          <span className={AT.sectionDescription}>Sin plantillas de campaña</span>
        </div>
      )}

      {!isLoading && !error && campaigns.length > 0 && (
        <div data-testid="campaigns-list" className="flex flex-col gap-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              data-testid={`campaign-card-${campaign.id}`}
              className="flex items-start justify-between gap-4 p-4 bg-[#0a1929]/40 border border-white/10 rounded-xl hover:border-white/20 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className={AT.cellValue}>{campaign.name}</p>
                  <p className="text-archon-sm text-slate-400 truncate">{campaign.subject}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className={`w-3 h-3 ${TYPE_COLOR[campaign.type]}`} />
                    <span className={`text-archon-sm font-black ${TYPE_COLOR[campaign.type]}`}>
                      {TYPE_LABEL[campaign.type]}
                    </span>
                  </div>
                </div>
              </div>
              <button
                data-testid={`campaign-send-${campaign.id}`}
                onClick={(): void => {
                  sendCampaign(campaign.id).catch(() => undefined);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-archon-blue/20 hover:bg-archon-blue/30 text-archon-blue text-archon-sm font-black uppercase tracking-widest rounded-lg border border-archon-blue/30 hover:border-archon-blue/50 transition-colors shrink-0"
              >
                <Send className="w-3 h-3" />
                Enviar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CampaignsPanel;
