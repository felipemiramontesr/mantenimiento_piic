import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Clock, ArrowRight, Activity, AlertTriangle, Fuel } from 'lucide-react';
import api from '../../api/client';
import { formatDateTime } from '../../utils/dateUtils';
import { useFleet } from '../../context/FleetContext';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';
import { archonCache } from '../../utils/archonCache';
import AT from '../../styles/archonTypography';

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
  const { units } = useFleet();

  // 🧠 FASE 1: Inteligencia de Sesión (Doble Pase Forense)
  // Escaneamos todos los logs antes de renderizar para construir el mapa de evidencia física
  const sessionEvidence = useMemo(() => {
    const evidenceMap = new Map<string, { maxObserved: number }>();

    logs.forEach((l) => {
      const normId = String(l.unit_id || '')
        .replace(/^(ASM-|UN-|0+)/gi, '')
        .trim()
        .toLowerCase();
      if (!normId) return;

      const current = evidenceMap.get(normId) || { maxObserved: 0 };

      // Si un log marca 100%, esa es nuestra capacidad observada "techo"
      if (l.fuel_level_after !== null && Number(l.fuel_level_after) === 100) {
        current.maxObserved = Math.max(current.maxObserved, Number(l.fuel_after));
      }

      evidenceMap.set(normId, current);
    });

    return evidenceMap;
  }, [logs]);

  const fetchLogs = async (useCache = true): Promise<void> => {
    // 🧠 Silk Hydration Phase 1: Cache-First
    if (useCache) {
      const cached = archonCache.get<ActivityLog[]>('forensic_journal_logs');
      if (cached) {
        let data = [...cached];
        if (routeUuid) {
          data = data.filter((l: ActivityLog) => l.reference_id === routeUuid);
          data = data.filter(
            (l: ActivityLog) => l.event_type !== 'ROUTE_START' && l.event_type !== 'ROUTE_FINISH'
          );
        } else if (unitId) {
          data = data.filter((l: ActivityLog) => l.unit_id === unitId);
        }
        data.sort(
          (a: ActivityLog, b: ActivityLog) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setLogs(data);
        setLoading(false);
      }
    }

    // 🧠 Silk Hydration Phase 2: Silent Sync
    try {
      const res = await api.get('/unit-logs');
      const freshData = res.data?.data || [];
      archonCache.set('forensic_journal_logs', freshData);

      let data = [...freshData];
      if (routeUuid) {
        data = data.filter((l: ActivityLog) => l.reference_id === routeUuid);
        data = data.filter(
          (l: ActivityLog) => l.event_type !== 'ROUTE_START' && l.event_type !== 'ROUTE_FINISH'
        );
      } else if (unitId) {
        data = data.filter((l: ActivityLog) => l.unit_id === unitId);
      }
      data.sort(
        (a: ActivityLog, b: ActivityLog) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Deep reference comparison to prevent unnecessary DOM flash
      setLogs((prev) => {
        const prevIds = prev.map((l) => l.id).join(',');
        const nextIds = data.map((l) => l.id).join(',');
        if (prevIds === nextIds && prev.length === data.length) {
          return prev;
        }
        return data;
      });
    } catch (err) {
      // Sovereign silence
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
  }, [unitId, routeUuid]);

  const getEventStyle = (
    type: string
  ): { label: string; color: string; bg: string; icon: React.ElementType } => {
    switch (type) {
      case 'ROUTE_START':
        return {
          label: 'SALIDA',
          color: 'text-pinnacle-navy',
          bg: 'bg-emerald-50',
          icon: Activity,
        };
      case 'ROUTE_FINISH':
        return { label: 'ENTRADA', color: 'text-pinnacle-navy', bg: 'bg-blue-50', icon: Shield };
      case 'ROUTE_INCIDENT':
        return {
          label: 'INCIDENCIA',
          color: 'text-pinnacle-navy',
          bg: 'bg-rose-50',
          icon: AlertTriangle,
        };
      case 'ADMIN_EDIT':
        return {
          label: 'CORRECCIÓN',
          color: 'text-pinnacle-navy',
          bg: 'bg-rose-50',
          icon: Shield,
        };
      default:
        return { label: 'EVENTO', color: 'text-pinnacle-navy', bg: 'bg-gray-50', icon: Clock };
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
        <div className="flex items-center gap-3 px-6 py-4 bg-white/50 rounded-[4px] border border-pinnacle-navy/5 mx-8">
          <Shield className="text-amber-500" size={24} />
          <div>
            <h2 className="text-lg font-black text-pinnacle-navy uppercase tracking-tighter leading-none">
              Journal de Activos
            </h2>
            <p className="text-[10px] font-bold text-pinnacle-navy opacity-40 uppercase tracking-widest">
              Rastro Inmutable de Operaciones y Desgaste
            </p>
          </div>
        </div>
      )}

      <div className={unitId ? '!w-full !px-0' : 'mx-8'}>
        {((): React.ReactNode => {
          if (loading && routeUuid) {
            return (
              <div className="w-full py-4 bg-slate-50/50 border-y border-slate-100 flex items-center justify-center gap-3 animate-pulse">
                <Activity size={16} className="text-slate-300 animate-spin" />
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  Verificando Salud de Ruta...
                </span>
              </div>
            );
          }
          if (logs.length === 0 && routeUuid && !loading) {
            return (
              <div className="w-full py-4 bg-emerald-50/50 border-y border-emerald-100 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                <Activity size={16} className="text-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em]">
                  Ruta Saludable
                </span>
              </div>
            );
          }
          return (
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
                  <tr key={log.id} className={isIncident ? 'forensic-incident-row' : ''}>
                    <td className="py-4 text-center">
                      <span className={AT.cellValue}>{formatDateTime(log.created_at)}</span>
                    </td>

                    <td className="py-4 text-center">
                      <span className="text-[9px] font-black text-pinnacle-navy bg-pinnacle-navy/5 px-1.5 py-0.5 rounded border border-pinnacle-navy/10 uppercase tracking-tighter">
                        {String(log.id).substring(0, 8)}
                      </span>
                    </td>

                    {!unitId && (
                      <td className="py-4 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span
                            className={`${AT.cellValue} bg-pinnacle-navy/5 px-2 py-0.5 rounded-[4px]`}
                          >
                            {log.unit_id}
                          </span>
                          <span className="text-[9px] font-bold opacity-40 uppercase">
                            {log.marca} {log.modelo}
                          </span>
                        </div>
                      </td>
                    )}

                    <td className="py-4 text-center">
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

                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        {((): React.ReactNode => {
                          let displayDesc = log.description || '';

                          // 🛡️ REGLA DE ORO: Normalización Forense de ID (Archon Resolver)
                          const normalizeId = (id: string | number | undefined): string =>
                            id
                              ? String(id)
                                  .replace(/^(ASM-|UN-|0+)/gi, '')
                                  .trim()
                                  .toLowerCase()
                              : '';

                          // 🏗️ REGISTRO DE IDENTIDAD (Look-up O(1) con Triple Redundancia)
                          const unitMap = new Map();
                          units.forEach((u) => {
                            const labelKey = normalizeId(u.id);
                            const uuidKey = normalizeId(u.uuid);
                            if (labelKey) unitMap.set(labelKey, u);
                            if (uuidKey) unitMap.set(uuidKey, u);
                          });

                          // 🔱 Resolución del Activo y Contexto de Sesión
                          const logUnitId = normalizeId(log.unit_id);
                          const unit = unitMap.get(logUnitId);

                          // 🧠 FASE 2: Validación con Evidencia de Sesión (Vector F)
                          const evidence = sessionEvidence.get(logUnitId);
                          const observedMax = evidence?.maxObserved || 0;
                          const theoreticalCap = unit?.fuelTankCapacity || 0;

                          // ⛽ MOTOR DE DETECCIÓN MULTI-VECTOR (Hardened)
                          const isPercentageAnomaly =
                            log.fuel_level_after !== null && Number(log.fuel_level_after) > 100.1;

                          // Si tenemos evidencia de que el tanque se llena con menos (ej: 22.5L), 40L es robo.
                          const isObservedAnomaly =
                            observedMax > 0 && Number(log.fuel_after) > observedMax + 0.1;

                          // Si excede la capacidad teórica de la base de datos
                          const isTheoreticalAnomaly =
                            theoreticalCap > 0 && Number(log.fuel_after) > theoreticalCap;

                          // Heurístico: Cualquier cambio sospechoso sin unidad resuelta
                          const isSuspicious = !unit && Number(log.fuel_after) > 45;

                          const isAnomalous =
                            isPercentageAnomaly ||
                            isObservedAnomaly ||
                            isTheoreticalAnomaly ||
                            isSuspicious;

                          // 🔱 Clean Redundancy
                          displayDesc = displayDesc.replace(/^MODIFICACIÓN:\s*/i, '');
                          displayDesc = displayDesc.replace(
                            /Modificación de todas las filas es redundante/gi,
                            ''
                          );

                          if (!displayDesc) {
                            if (log.event_type === 'ROUTE_START')
                              displayDesc = 'Despliegue operativo iniciado.';
                            else if (log.event_type === 'ROUTE_FINISH')
                              displayDesc = 'Cierre de misión logístico.';
                            else displayDesc = '—';
                          }

                          return (
                            <>
                              {isAnomalous && (
                                <div className="w-full px-2 py-1.5 bg-rose-600 rounded-[2px] border border-rose-700 shadow-md animate-pulse mb-1">
                                  <div className="flex items-center gap-1.5 justify-center">
                                    <AlertTriangle size={11} className="text-white" />
                                    <span className="text-[8.5px] font-black text-white uppercase tracking-tighter leading-none text-center">
                                      Posible desviación de consumo o robo de combustible
                                    </span>
                                  </div>
                                </div>
                              )}
                              <p
                                className={`text-[10px] font-bold leading-tight text-center w-full text-pinnacle-navy ${
                                  isIncident ? 'not-italic px-3 py-1' : 'opacity-70 italic'
                                } ${
                                  isAnomalous
                                    ? 'text-rose-700 bg-rose-50/70 rounded p-1.5 border-2 border-rose-200 shadow-inner'
                                    : ''
                                }`}
                              >
                                {displayDesc}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    </td>

                    <td className="py-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {/* 🚗 READING IMPACT (KM/HRS) */}
                        {log.reading_before !== null &&
                          log.reading_after !== null &&
                          Number(log.reading_before) !== Number(log.reading_after) && (
                            <div className="flex items-center gap-2 bg-pinnacle-navy/5 px-2 py-1 rounded-[4px]">
                              <Activity size={10} className="text-pinnacle-navy opacity-50" />
                              <span className="text-[10px] font-black text-pinnacle-navy">
                                {log.reading_before?.toLocaleString()}
                              </span>
                              <ArrowRight size={10} className="opacity-30" />
                              <span className="text-[10px] font-black text-pinnacle-navy">
                                {log.reading_after?.toLocaleString()}
                              </span>
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded-sm">
                                {delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()}{' '}
                                KM
                              </span>
                            </div>
                          )}

                        {/* ⛽ FUEL IMPACT (Liters) */}
                        {log.fuel_before !== null &&
                          log.fuel_after !== null &&
                          Number(log.fuel_before) !== Number(log.fuel_after) && (
                            <div className="flex items-center gap-2 bg-amber-50/50 border border-amber-100 px-2 py-1 rounded-[4px]">
                              <Fuel size={10} className="text-amber-600" />
                              <span className="text-[10px] font-black text-pinnacle-navy">
                                {Number(log.fuel_before).toFixed(1)} L
                              </span>
                              <ArrowRight size={10} className="opacity-30" />
                              <span className="text-[10px] font-black text-pinnacle-navy">
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
                              <span className="text-[10px] font-black text-pinnacle-navy">
                                {Number(log.fuel_level_before).toFixed(0)}%
                              </span>
                              <ArrowRight size={10} className="opacity-30" />
                              <span className="text-[10px] font-black text-pinnacle-navy">
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
                              <span className="text-[10px] font-black text-pinnacle-navy">
                                {Number(log.fuel_amount_before).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                              <ArrowRight size={10} className="opacity-30" />
                              <span className="text-[10px] font-black text-emerald-600">$</span>
                              <span className="text-[10px] font-black text-pinnacle-navy">
                                {Number(log.fuel_amount_after).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}

                        {/* 🔱 UNIVERSAL DELTA ENGINE (Snapshot Comparison) */}
                        {((): React.ReactNode => {
                          const { snapshot_before: rawBefore, snapshot_after: rawAfter } = log;

                          if (!rawBefore || !rawAfter) return null;

                          let before: Record<string, unknown>;
                          let after: Record<string, unknown>;

                          // SAFE PARSE: Ensure we are working with objects, not strings
                          try {
                            before =
                              typeof rawBefore === 'string'
                                ? JSON.parse(rawBefore)
                                : (rawBefore as Record<string, unknown>);
                            after =
                              typeof rawAfter === 'string'
                                ? JSON.parse(rawAfter)
                                : (rawAfter as Record<string, unknown>);
                          } catch (e) {
                            return null;
                          }

                          // 🛡️ ARCHON WHITELIST: Only show business-relevant fields that ARE NOT
                          // already represented by the specialized icon rows above.
                          const whitelist: Record<string, string> = {
                            destination: 'Destino',
                            status: 'Estado',
                            additives_check: 'Aditivos',
                          };

                          const whitelistedChanges = Object.keys(after).filter((key) => {
                            if (!whitelist[key]) return false;
                            const vB = (before as Record<string, unknown>)[key];
                            const vA = (after as Record<string, unknown>)[key];
                            return vB !== vA && !(vB === null && vA === null);
                          });

                          if (whitelistedChanges.length === 0) return null;

                          return (
                            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                              {whitelistedChanges.map((key) => {
                                const valBefore = (before as Record<string, unknown>)[key];
                                const valAfter = (after as Record<string, unknown>)[key];
                                const label = whitelist[key];

                                // Dynamic Units (Prefix/Suffix)
                                let prefix = '';
                                let suffix = '';
                                if (key.includes('amount')) prefix = '$';
                                if (key === 'fuel_liters_loaded') suffix = ' L';
                                if (key.includes('reading')) suffix = ' KM';
                                if (key.includes('level')) suffix = ' %';

                                const formatVal = (v: unknown, k: string): string => {
                                  if (v === null || v === undefined) return '—';
                                  if (k === 'additives_check') return v ? 'SI' : 'NO';
                                  if (!Number.isNaN(Number(v))) {
                                    return Number(v).toLocaleString(undefined, {
                                      minimumFractionDigits: k.includes('amount') ? 2 : 1,
                                    });
                                  }
                                  return String(v);
                                };

                                return (
                                  <div
                                    key={key}
                                    className="flex items-center gap-1.5 bg-pinnacle-navy/[0.03] border border-pinnacle-navy/5 px-2 py-0.5 rounded-[4px]"
                                  >
                                    <span className="text-[8px] font-black text-pinnacle-navy opacity-40 uppercase">
                                      {label}:
                                    </span>
                                    <span className="text-[9px] font-bold text-pinnacle-navy opacity-50 line-through">
                                      {prefix}
                                      {formatVal(valBefore, key)}
                                      {suffix}
                                    </span>
                                    <ArrowRight size={8} className="opacity-20" />
                                    <span className="text-[9px] font-black text-blue-600">
                                      {prefix}
                                      {formatVal(valAfter, key)}
                                      {suffix}
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
                            <div className="flex items-center gap-2 bg-pinnacle-navy/5 px-2 py-1 rounded-[4px]">
                              <Shield size={10} className="text-pinnacle-navy opacity-50" />
                              <span className="text-[10px] font-black text-pinnacle-navy opacity-40">
                                {log.status_before}
                              </span>
                              <ArrowRight size={10} className="opacity-30" />
                              <span className="text-[10px] font-black text-pinnacle-navy">
                                {log.status_after}
                              </span>
                            </div>
                          )}

                        {/* 🔱 NO IMPACT DETECTED */}
                        {(!log.reading_before ||
                          Number(log.reading_before) === Number(log.reading_after)) &&
                          (!log.fuel_before ||
                            Number(log.fuel_before) === Number(log.fuel_after)) &&
                          (!log.fuel_level_before ||
                            Number(log.fuel_level_before) === Number(log.fuel_level_after)) &&
                          (!log.fuel_amount_before ||
                            Number(log.fuel_amount_before) === Number(log.fuel_amount_after)) &&
                          (!log.status_before || log.status_before === log.status_after) && (
                            <span className="text-[10px] font-black text-pinnacle-navy opacity-20">
                              —
                            </span>
                          )}
                      </div>
                    </td>

                    <td className="py-4 text-center">
                      <div className="text-center">
                        <p className={AT.cellValue}>{log.operatorName}</p>
                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">
                          Certified Audit
                        </p>
                      </div>
                    </td>
                  </tr>
                );
              }}
            />
          );
        })()}
      </div>
    </div>
  );
};

export default ForensicJournalTable;
