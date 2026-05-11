import React, { useState, useEffect } from 'react';
import { Shield, Clock, ArrowRight, Activity, AlertTriangle, Fuel } from 'lucide-react';
import api from '../../api/client';
import { formatDateTime } from '../../utils/dateUtils';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';

interface ActivityLog {
  id: string;
  unit_id: string;
  event_type: string;
  reference_id: string;
  reading_before: number;
  reading_after: number;
  status_before: string;
  status_after: string;
  fuel_before?: number;
  fuel_after?: number;
  fuel_level_before?: number;
  fuel_level_after?: number;
  fuel_amount_before?: number;
  fuel_amount_after?: number;
  snapshot_before?: Record<string, unknown>;
  snapshot_after?: Record<string, unknown>;
  description: string;
  operatorName: string;
  marca: string;
  modelo: string;
  created_at: string;
  unit_sede?: string;
  route_destination?: string;
  route_origin_label?: string;
}

interface ForensicJournalTableProps {
  unitId?: string;
  routeUuid?: string;
  hideHeader?: boolean;
}

/**
 * 🔱 ARCHON FORENSIC JOURNAL TABLE
 * Purpose: Immutable trace of all asset impacts and telemetery deltas.
 * Version: 1.2.0 - Full-Width Symmetry Standard
 */
const ForensicJournalTable: React.FC<ForensicJournalTableProps> = ({
  unitId,
  routeUuid,
  hideHeader,
}) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (): Promise<void> => {
    try {
      const res = await api.get('/unit-logs');
      let data = res.data?.data || [];

      if (routeUuid) {
        // 🔱 Route-Scoped Filter: Only show forensic events linked to this specific route
        data = data.filter((l: ActivityLog) => l.reference_id === routeUuid);

        // 🔱 Clean Redundancy: Focus exclusively on anomalies/incidents
        data = data.filter(
          (l: ActivityLog) => l.event_type !== 'ROUTE_START' && l.event_type !== 'ROUTE_FINISH'
        );
      } else if (unitId) {
        data = data.filter((l: ActivityLog) => l.unit_id === unitId);
      }

      // 🔱 Chronological Sequencing (Descending Order: Newest First)
      data.sort(
        (a: ActivityLog, b: ActivityLog) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setLogs(data);
    } catch (err) {
      // Sovereign silence
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [unitId, routeUuid]);

  const getEventStyle = (
    type: string
  ): { label: string; color: string; bg: string; icon: React.ElementType } => {
    switch (type) {
      case 'ROUTE_START':
        return { label: 'SALIDA', color: 'text-[#0f2a44]', bg: 'bg-emerald-50', icon: Activity };
      case 'ROUTE_FINISH':
        return { label: 'ENTRADA', color: 'text-[#0f2a44]', bg: 'bg-blue-50', icon: Shield };
      case 'ROUTE_INCIDENT':
        return {
          label: 'INCIDENCIA',
          color: 'text-[#0f2a44]',
          bg: 'bg-rose-50',
          icon: AlertTriangle,
        };
      case 'ADMIN_EDIT':
        return {
          label: 'CORRECCIÓN',
          color: 'text-[#0f2a44]',
          bg: 'bg-rose-50',
          icon: Shield,
        };
      default:
        return { label: 'EVENTO', color: 'text-[#0f2a44]', bg: 'bg-gray-50', icon: Clock };
    }
  };

  const headers: ArchonTableHeader[] = [
    { key: 'fecha', label: 'FECHA / HORA' },
    { key: 'folio', label: 'FOLIO' },
    ...(!unitId ? [{ key: 'activo', label: 'ACTIVO' }] : []),
    { key: 'evento', label: 'EVENTO / IMPACTO' },
    { key: 'descripcion', label: 'DESCRIPCIÓN / NOTA' },
    { key: 'modificacion', label: 'MODIFICACIÓN' },
    { key: 'responsable', label: 'RESPONSABLE' },
  ] as ArchonTableHeader[];

  const emptyMsg = routeUuid
    ? 'Ruta Saludable | No existen Incidencias'
    : 'Sin registros forenses para esta unidad';

  return (
    <div
      className={`animate-in fade-in duration-700 w-full !p-0 !m-0 ${unitId ? '' : 'space-y-6'}`}
    >
      {!hideHeader && !unitId && (
        <div className="flex items-center gap-3 px-6 py-4 bg-white/50 glass-card-pro rounded-[4px] border border-[#0f2a44]/5 mx-8">
          <Shield className="text-amber-500" size={24} />
          <div>
            <h2 className="text-lg font-black text-[#0f2a44] uppercase tracking-tighter leading-none">
              Journal de Activos
            </h2>
            <p className="text-[10px] font-bold text-[#0f2a44] opacity-40 uppercase tracking-widest">
              Rastro Inmutable de Operaciones y Desgaste
            </p>
          </div>
        </div>
      )}

      <div className={unitId ? '!w-full !px-0' : 'mx-8'}>
        {logs.length === 0 && routeUuid && !loading ? (
          <div className="w-full py-4 bg-emerald-50/50 border-y border-emerald-100 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
            <Activity size={16} className="text-emerald-500 animate-pulse" />
            <span className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em]">
              Ruta Saludable
            </span>
          </div>
        ) : (
          <ArchonDataTable
            className={unitId ? '!w-full !shadow-none !rounded-none !border-none' : ''}
            testId="forensic-journal-table"
            variant={unitId ? 'embedded' : 'master'}
            loading={loading}
            loadingMessage="Accediendo a Memoria Forense..."
            data={logs}
            headers={headers}
            emptyMessage={emptyMsg}
            renderRow={(log, _index): React.ReactNode => {
              const style = getEventStyle(log.event_type);
              const delta = log.reading_after ? log.reading_after - log.reading_before : 0;
              const EventIcon = style.icon;
              const isIncident =
                log.event_type === 'ROUTE_INCIDENT' || log.event_type === 'ADMIN_EDIT';

              return (
                <tr
                  key={log.id}
                  className={`animate-in slide-in-from-left-2 duration-300 ${
                    isIncident ? 'forensic-incident-row' : ''
                  }`}
                >
                  <td className="py-4">
                    <span className="text-[11px] font-black text-[#0f2a44]">
                      {formatDateTime(log.created_at)}
                    </span>
                  </td>

                  <td className="py-4">
                    <span className="text-[9px] font-black text-[#0f2a44] bg-[#0f2a44]/5 px-1.5 py-0.5 rounded border border-[#0f2a44]/10 uppercase tracking-tighter">
                      {String(log.id).substring(0, 8)}
                    </span>
                  </td>

                  {!unitId && (
                    <td className="py-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black bg-[#0f2a44]/5 px-2 py-0.5 rounded-[4px] text-[#0f2a44]">
                          {log.unit_id}
                        </span>
                        <span className="text-[9px] font-bold opacity-40 uppercase">
                          {log.marca} {log.modelo}
                        </span>
                      </div>
                    </td>
                  )}

                  <td className="py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`p-1.5 rounded-[4px] ${style.bg}`}>
                        <EventIcon size={12} className={style.color} />
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest ${style.color}`}
                      >
                        {style.label}
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      {((): React.ReactNode => {
                        let displayDesc = log.description || '';

                        // 🔱 Clean Redundancy: Strip the redundant prefix if present
                        displayDesc = displayDesc.replace(/^MODIFICACIÓN:\s*/i, '');

                        if (!displayDesc) {
                          if (log.event_type === 'ROUTE_START')
                            displayDesc = 'Despliegue operativo iniciado.';
                          else if (log.event_type === 'ROUTE_FINISH')
                            displayDesc = 'Cierre de misión logístico.';
                          else displayDesc = '—';
                        }

                        return (
                          <p
                            className={`text-[10px] font-bold leading-tight text-center w-full text-[#0f2a44] ${
                              isIncident ? 'not-italic px-3 py-1' : 'opacity-70 italic'
                            }`}
                          >
                            {displayDesc}
                          </p>
                        );
                      })()}
                    </div>
                  </td>

                  <td className="py-4">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      {/* 🚗 READING IMPACT (KM/HRS) */}
                      {log.reading_before !== null &&
                        log.reading_after !== null &&
                        Number(log.reading_before) !== Number(log.reading_after) && (
                          <div className="flex items-center gap-2 bg-[#0f2a44]/5 px-2 py-1 rounded-[4px]">
                            <Activity size={10} className="text-[#0f2a44] opacity-50" />
                            <span className="text-[10px] font-black text-[#0f2a44]">
                              {log.reading_before?.toLocaleString()}
                            </span>
                            <ArrowRight size={10} className="opacity-30" />
                            <span className="text-[10px] font-black text-[#0f2a44]">
                              {log.reading_after?.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded-sm">
                              {delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()} KM
                            </span>
                          </div>
                        )}

                      {/* ⛽ FUEL IMPACT (Liters) */}
                      {log.fuel_before !== null &&
                        log.fuel_after !== null &&
                        Number(log.fuel_before) !== Number(log.fuel_after) && (
                          <div className="flex items-center gap-2 bg-amber-50/50 border border-amber-100 px-2 py-1 rounded-[4px]">
                            <Fuel size={10} className="text-amber-600" />
                            <span className="text-[10px] font-black text-[#0f2a44]">
                              {Number(log.fuel_before).toFixed(1)} L
                            </span>
                            <ArrowRight size={10} className="opacity-30" />
                            <span className="text-[10px] font-black text-[#0f2a44]">
                              {Number(log.fuel_after).toFixed(1)} L
                            </span>
                          </div>
                        )}

                      {/* ⛽ FUEL IMPACT (Percentage Level) */}
                      {log.fuel_level_before !== null &&
                        log.fuel_level_after !== null &&
                        Number(log.fuel_level_before) !== Number(log.fuel_level_after) && (
                          <div className="flex items-center gap-2 bg-amber-50/50 border border-amber-100 px-2 py-1 rounded-[4px]">
                            <Fuel size={10} className="text-amber-600" />
                            <span className="text-[10px] font-black text-[#0f2a44]">
                              {Number(log.fuel_level_before).toFixed(0)}%
                            </span>
                            <ArrowRight size={10} className="opacity-30" />
                            <span className="text-[10px] font-black text-[#0f2a44]">
                              {Number(log.fuel_level_after).toFixed(0)}%
                            </span>
                          </div>
                        )}

                      {/* 💰 FINANCIAL IMPACT (Cost) */}
                      {log.fuel_amount_before !== null &&
                        log.fuel_amount_after !== null &&
                        Number(log.fuel_amount_before) !== Number(log.fuel_amount_after) && (
                          <div className="flex items-center gap-2 bg-emerald-50/50 border border-emerald-100 px-2 py-1 rounded-[4px]">
                            <span className="text-[10px] font-black text-emerald-600">$</span>
                            <span className="text-[10px] font-black text-[#0f2a44]">
                              {Number(log.fuel_amount_before).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            <ArrowRight size={10} className="opacity-30" />
                            <span className="text-[10px] font-black text-[#0f2a44]">
                              {Number(log.fuel_amount_after).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        )}

                      {/* 🔱 UNIVERSAL DELTA ENGINE (Snapshot Comparison) */}
                      {((): React.ReactNode => {
                        const before = log.snapshot_before;
                        const after = log.snapshot_after;

                        if (!before || !after) return null;

                        return (
                          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                            {Object.keys(after).map((key) => {
                              const valBefore = before[key];
                              const valAfter = after[key];

                              // Skip fields already handled by specialized UI or internal IDs
                              const skipFields = [
                                'id',
                                'uuid',
                                'unit_id',
                                'created_at',
                                'updated_at',
                                'driver_id',
                                'start_reading',
                                'end_reading',
                                'fuel_liters_loaded',
                                'fuel_level_start',
                                'fuel_level_end',
                                'fuel_amount',
                                'status',
                              ];

                              if (skipFields.includes(key)) return null;

                              // Only show if value actually changed
                              if (
                                valBefore === valAfter ||
                                (valBefore === null && valAfter === null)
                              )
                                return null;

                              // Handle display labels for specific keys
                              const labelMap: Record<string, string> = {
                                destination: 'Destino',
                                origin_id: 'Origen ID',
                                description: 'Nota',
                                tire_pressure_json: 'Presión Llantas',
                                checklist_json: 'Checklist',
                                additives_check: 'Aditivos',
                              };

                              const label = labelMap[key] || key.toUpperCase();

                              return (
                                <div
                                  key={key}
                                  className="flex items-center gap-1.5 bg-[#0f2a44]/[0.03] border border-[#0f2a44]/5 px-2 py-0.5 rounded-[4px]"
                                >
                                  <span className="text-[8px] font-black text-[#0f2a44] opacity-40 uppercase">
                                    {label}:
                                  </span>
                                  <span className="text-[9px] font-bold text-[#0f2a44] opacity-50 line-through">
                                    {String(valBefore || '—')}
                                  </span>
                                  <ArrowRight size={8} className="opacity-20" />
                                  <span className="text-[9px] font-black text-blue-600">
                                    {String(valAfter || '—')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* 🛡️ STATUS IMPACT */}
                      {log.status_before !== log.status_after &&
                        log.status_before &&
                        log.status_after && (
                          <div className="flex items-center gap-2 bg-[#0f2a44]/5 px-2 py-1 rounded-[4px]">
                            <Shield size={10} className="text-[#0f2a44] opacity-50" />
                            <span className="text-[10px] font-black text-[#0f2a44] opacity-40">
                              {log.status_before}
                            </span>
                            <ArrowRight size={10} className="opacity-30" />
                            <span className="text-[10px] font-black text-[#0f2a44]">
                              {log.status_after}
                            </span>
                          </div>
                        )}

                      {/* 🔱 NO IMPACT DETECTED */}
                      {(!log.reading_before ||
                        Number(log.reading_before) === Number(log.reading_after)) &&
                        (!log.fuel_before || Number(log.fuel_before) === Number(log.fuel_after)) &&
                        (!log.fuel_level_before ||
                          Number(log.fuel_level_before) === Number(log.fuel_level_after)) &&
                        (!log.fuel_amount_before ||
                          Number(log.fuel_amount_before) === Number(log.fuel_amount_after)) &&
                        (!log.status_before || log.status_before === log.status_after) && (
                          <span className="text-[10px] font-black text-[#0f2a44] opacity-20">
                            —
                          </span>
                        )}
                    </div>
                  </td>

                  <td className="py-4">
                    <div className="text-center">
                      <p className="text-[11px] font-black text-[#0f2a44]">{log.operatorName}</p>
                      <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">
                        Certified Audit
                      </p>
                    </div>
                  </td>
                </tr>
              );
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ForensicJournalTable;
