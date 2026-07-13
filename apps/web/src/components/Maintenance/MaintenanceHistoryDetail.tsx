import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Wrench,
  Gauge,
  Calendar,
  User,
  DollarSign,
  ClipboardCheck,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  MinusCircle,
  XCircle,
  Clock,
  FileDown,
} from 'lucide-react';
import { isRemoteExportAllowed } from '../../utils/exportUtils';
import {
  MaintenanceLog,
  MaintenanceFullDetail,
  MaintenanceTaskDetail,
} from '../../types/maintenance';
import api from '../../api/client';
import AT from '../../styles/archonTypography';
import { formatDate } from '../../utils/dateUtils';

interface MaintenanceHistoryDetailProps {
  log: MaintenanceLog;
  onBack: () => void;
}

const SERVICE_LABELS: Record<string, string> = {
  BASIC_10K: 'Básico 10,000 km',
  INTERMEDIATE_20K: 'Intermedio 20,000 km',
  MAJOR_30K: 'Mayor 30,000 km',
  ADVANCED_50K: 'Avanzado 50,000 km',
  MINOR_MINING: 'Servicio Menor',
};

type StatusMeta = {
  icon: React.ReactNode;
  bg: string;
  text: string;
  border: string;
};

const STATUS_META: Record<string, StatusMeta> = {
  PASS: {
    icon: <ShieldCheck size={11} />,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700',
    border: 'border-emerald-500/20',
  },
  REPLACED: {
    icon: <RotateCcw size={11} />,
    bg: 'bg-blue-500/10',
    text: 'text-blue-700',
    border: 'border-blue-500/20',
  },
  FAIL: {
    icon: <XCircle size={11} />,
    bg: 'bg-red-500/10',
    text: 'text-red-700',
    border: 'border-red-500/20',
  },
  N_A: {
    icon: <MinusCircle size={11} />,
    bg: 'bg-slate-500/10',
    text: 'text-slate-500',
    border: 'border-slate-400/20',
  },
  SKIPPED_NA: {
    icon: <MinusCircle size={11} />,
    bg: 'bg-slate-500/10',
    text: 'text-slate-500',
    border: 'border-slate-400/20',
  },
  DEFERRED: {
    icon: <Clock size={11} />,
    bg: 'bg-amber-500/10',
    text: 'text-amber-700',
    border: 'border-amber-400/30',
  },
};

const fallbackMeta: StatusMeta = {
  icon: <AlertCircle size={11} />,
  bg: 'bg-slate-100',
  text: 'text-slate-500',
  border: 'border-slate-200',
};

const MaintenanceHistoryDetail: React.FC<MaintenanceHistoryDetailProps> = ({ log, onBack }) => {
  const [detail, setDetail] = useState<MaintenanceFullDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/maintenance/${log.uuid}`)
      .then((res) => {
        if (res.data.success) setDetail(res.data.data as MaintenanceFullDetail);
      })
      .catch(() => setError('No se pudo cargar el detalle del servicio.'))
      .finally(() => setLoading(false));
  }, [log.uuid]);

  const grouped = React.useMemo(() => {
    if (!detail?.details) return {} as Record<string, MaintenanceTaskDetail[]>;
    const order = ['FAIL', 'DEFERRED', 'REPLACED', 'PASS', 'SKIPPED_NA', 'N_A'];
    const map: Record<string, MaintenanceTaskDetail[]> = {};
    order.forEach((s) => {
      map[s] = [];
    });
    detail.details.forEach((d) => {
      if (!map[d.status]) map[d.status] = [];
      map[d.status].push(d);
    });
    return map;
  }, [detail]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-20 space-y-8">
      {/* ── HEADER ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-[4px] bg-[#0f2a44]/5 hover:bg-[#0f2a44]/10 text-[#0f2a44] text-archon-md font-black uppercase tracking-wider transition-all duration-200"
        >
          <ArrowLeft size={14} />
          Volver
        </button>
        <div>
          <p className="text-archon-base font-black text-[#0f2a44]/40 uppercase tracking-[0.2em]">
            Historial de Servicio
          </p>
          <p className="text-[15px] font-black text-[#0f2a44]">
            MNT-{String(log.id).padStart(5, '0')} · {log.unit_id}
          </p>
        </div>
        {/* FC 041 F.E — exportación PDF con gate offline (T1) */}
        <button
          type="button"
          data-testid="download-pdf-btn"
          disabled={!isRemoteExportAllowed(true, navigator.onLine)}
          title={
            isRemoteExportAllowed(true, navigator.onLine)
              ? 'Descargar PDF de la orden'
              : 'Acción no disponible en modo sin conexión'
          }
          onClick={async (): Promise<void> => {
            const response = await api.get(`/reports/maintenance/${log.uuid}/pdf`, {
              responseType: 'blob',
            });
            const url = URL.createObjectURL(response.data as Blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `orden_${log.uuid}.pdf`;
            anchor.click();
            URL.revokeObjectURL(url);
          }}
          className="ml-auto flex items-center gap-2 px-3 py-2 rounded-[4px] bg-[#0f2a44] text-white text-archon-md font-black uppercase tracking-wider transition-all duration-200 hover:bg-[#0f2a44]/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileDown size={14} />
          Descargar PDF
        </button>
      </div>

      {/* ── SUMMARY CARDS ──────────────────────────────────────────────────────── */}
      <div className="archon-grid-2-sovereign items-start gap-10">
        <div className="card-archon-sovereign bg-white p-8 [--card-accent:#0f2a44]">
          <div className="card-sovereign-header mb-6">
            <Wrench className="text-[var(--card-accent)]" size={20} />
            <h3 className="card-sovereign-title text-archon-lg opacity-100">DATOS DEL SERVICIO</h3>
          </div>
          <dl className="space-y-3">
            {[
              {
                icon: <Wrench size={13} />,
                label: 'Tipo',
                value: SERVICE_LABELS[log.service_type] ?? log.service_type,
              },
              {
                icon: <Gauge size={13} />,
                label: 'Odómetro',
                value: `${Number(log.odometer_at_service).toLocaleString()} KM`,
              },
              { icon: <Calendar size={13} />, label: 'Fecha', value: formatDate(log.service_date) },
              { icon: <User size={13} />, label: 'Técnico', value: log.technician },
              {
                icon: <DollarSign size={13} />,
                label: 'Costo',
                value: `$${Number(log.cost).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} MXN`,
              },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-[#0f2a44]/30 shrink-0">{icon}</span>
                <span className="text-archon-base font-black text-[#0f2a44]/40 uppercase tracking-[0.12em] w-16 shrink-0">
                  {label}
                </span>
                <span className="text-archon-label font-bold text-[#0f2a44] truncate">{value}</span>
              </div>
            ))}
          </dl>
        </div>

        {/* Task count summary */}
        <div className="card-archon-sovereign bg-white p-8 [--card-accent:#0f2a44]">
          <div className="card-sovereign-header mb-6">
            <ClipboardCheck className="text-[var(--card-accent)]" size={20} />
            <h3 className="card-sovereign-title text-archon-lg opacity-100">RESUMEN DE TAREAS</h3>
          </div>
          {loading ? (
            <p className="text-archon-base font-black text-[#0f2a44]/30 uppercase tracking-[0.2em]">
              Cargando...
            </p>
          ) : (
            <dl className="space-y-2">
              {Object.entries(STATUS_META).map(([code, meta]) => {
                const count = (grouped[code] ?? []).length;
                if (count === 0) return null;
                return (
                  <div key={code} className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-archon-sm font-black uppercase tracking-wider ${meta.bg} ${meta.text} ${meta.border}`}
                    >
                      {meta.icon}
                      {code}
                    </span>
                    <span className="text-archon-lg font-black text-[#0f2a44]">{count}</span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-[#0f2a44]/5 flex items-center gap-3">
                <span className="text-archon-base font-black text-[#0f2a44]/40 uppercase tracking-[0.12em]">
                  Total
                </span>
                <span className="text-[15px] font-black text-[#0f2a44]">
                  {detail?.details.length ?? 0}
                </span>
              </div>
            </dl>
          )}
        </div>
      </div>

      {/* ── TASK DETAIL LIST ──────────────────────────────────────────────────── */}
      <div className="card-archon-sovereign bg-white [--card-accent:#0f2a44] !pb-2">
        <div className="card-sovereign-header p-10 pb-0">
          <ClipboardCheck className="text-[var(--card-accent)]" size={22} />
          <h3 className="card-sovereign-title text-archon-xl opacity-100">DETALLE DE TAREAS</h3>
        </div>

        {loading && (
          <div className="p-12 text-center text-archon-base font-black text-[#0f2a44]/40 uppercase tracking-[0.2em]">
            Cargando tareas...
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-archon-label font-bold text-red-600">{error}</div>
        )}

        {!loading && !error && detail && detail.details.length === 0 && (
          <div className="p-12 text-center text-archon-base font-black text-[#0f2a44]/30 uppercase tracking-[0.2em]">
            Este servicio no tiene tareas registradas.
          </div>
        )}

        {!loading && !error && detail && detail.details.length > 0 && (
          <div className="divide-y divide-[#0f2a44]/5">
            {detail.details.map((task) => {
              const meta = STATUS_META[task.status] ?? fallbackMeta;
              return (
                <div
                  key={task.taskCode}
                  className="px-10 py-4 flex items-center gap-8 hover:bg-[#0f2a44]/[0.02] transition-colors duration-200"
                >
                  {/* Status badge */}
                  <div className="shrink-0 w-28">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-archon-sm font-black uppercase tracking-wider ${meta.bg} ${meta.text} ${meta.border}`}
                    >
                      {meta.icon}
                      {task.statusLabel}
                    </span>
                  </div>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-archon-lg font-bold text-[#0f2a44] truncate">
                        {task.label}
                      </span>
                      {task.isCritical && (
                        <span
                          className={`${AT.statusBadge} bg-red-500/10 text-red-700 border-red-500/20 shrink-0`}
                        >
                          ● CRÍTICO
                        </span>
                      )}
                    </div>
                    <span className="text-archon-sm font-black text-[#0f2a44]/30 uppercase tracking-[0.15em]">
                      {task.taskCode}
                    </span>
                  </div>

                  {/* Notes */}
                  {task.notes && (
                    <p className="shrink-0 max-w-[200px] text-archon-md text-[#0f2a44]/50 italic truncate">
                      {task.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceHistoryDetail;
