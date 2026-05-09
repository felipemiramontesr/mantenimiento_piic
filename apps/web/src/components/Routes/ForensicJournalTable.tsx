import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, ArrowRight, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '../../api/client';
import { formatDateTime } from '../../utils/dateUtils';

interface ActivityLog {
  id: number;
  unit_id: string;
  event_type: string;
  reference_id: string;
  reading_before: number;
  reading_after: number;
  status_before: string;
  status_after: string;
  description: string;
  operatorName: string;
  marca: string;
  modelo: string;
  created_at: string;
}

interface ForensicJournalTableProps {
  unitId?: string;
  hideHeader?: boolean;
}

/**
 * 🔱 ARCHON FORENSIC JOURNAL TABLE
 * Purpose: Immutable trace of all asset impacts and telemetery deltas.
 * Version: 1.2.0 - Full-Width Symmetry Standard
 */
const ForensicJournalTable: React.FC<ForensicJournalTableProps> = ({ unitId, hideHeader }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (): Promise<void> => {
    try {
      const res = await api.get('/unit-logs');
      let data = res.data?.data || [];

      if (unitId) {
        data = data.filter((l: ActivityLog) => l.unit_id === unitId);
      }

      setLogs(data);
    } catch (err) {
      // Sovereign silence
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [unitId]);

  const getEventStyle = (
    type: string
  ): { label: string; color: string; bg: string; icon: React.ElementType } => {
    switch (type) {
      case 'ROUTE_START':
        return { label: 'SALIDA', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: Activity };
      case 'ROUTE_FINISH':
        return { label: 'ENTRADA', color: 'text-blue-500', bg: 'bg-blue-50', icon: Shield };
      case 'ROUTE_INCIDENT':
        return {
          label: 'INCIDENCIA',
          color: 'text-rose-600',
          bg: 'bg-rose-50',
          icon: AlertTriangle,
        };
      default:
        return { label: 'EVENTO', color: 'text-gray-500', bg: 'bg-gray-50', icon: Clock };
    }
  };

  if (loading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <p className="text-[#0f2a44] font-black animate-pulse uppercase tracking-widest text-[10px]">
          Accediendo a Memoria Forense...
        </p>
      </div>
    );
  }

  return (
    <div className={`animate-in fade-in duration-700 w-full ${unitId ? '' : 'space-y-6'}`}>
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

      <div
        className={`${
          unitId ? 'bg-transparent w-full !p-0 !m-0' : 'glass-card-pro bg-white shadow-2xl mx-8'
        } !pt-0 ${unitId ? '!pb-0' : '!pb-4'} overflow-x-auto ${
          unitId ? '' : 'rounded-[4px]'
        } custom-scrollbar`}
      >
        <table
          className={`archon-registry-table w-full ${unitId ? 'forensic-focus-green' : ''}`}
          style={{ tableLayout: 'fixed', minWidth: '100%' }}
        >
          <thead>
            <tr className={unitId ? 'bg-[#0f2a44]/[0.02]' : ''}>
              <th style={{ width: '15%' }}>FECHA / HORA</th>
              {!unitId && <th style={{ width: '15%' }}>ACTIVO</th>}
              <th style={{ width: '15%' }}>EVENTO / IMPACTO</th>
              <th style={{ width: '40%' }}>DESCRIPCIÓN / NOTA</th>
              <th style={{ width: '15%' }}>TELEMETRÍA (SNAPSHOT)</th>
              <th style={{ width: '10%' }}>DELTA</th>
              <th style={{ width: '15%' }}>RESPONSABLE</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => {
              const style = getEventStyle(log.event_type);
              const delta = log.reading_after ? log.reading_after - log.reading_before : 0;
              const EventIcon = style.icon;

              return (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <td className="py-4">
                    <span className="text-[11px] font-black text-[#0f2a44]">
                      {formatDateTime(log.created_at)}
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
                    <p className="text-[10px] font-bold text-[#0f2a44] opacity-70 line-clamp-2 italic leading-tight text-center">
                      {log.description || 'Sin descripción forense'}
                    </p>
                  </td>

                  <td className="py-4">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[10px] font-bold opacity-60">
                        {log.reading_before?.toLocaleString()}
                      </span>
                      <ArrowRight size={10} className="opacity-20" />
                      <span className="text-[11px] font-black text-[#0f2a44]">
                        {log.reading_after?.toLocaleString() || '---'}
                      </span>
                      <span className="text-[9px] font-bold opacity-30">KM</span>
                    </div>
                  </td>

                  <td className="py-4">
                    {delta > 0 ? (
                      <div className="flex items-center justify-center gap-1 text-rose-600">
                        <TrendingUp size={10} />
                        <span className="text-[11px] font-black">+{delta.toLocaleString()}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold opacity-20">---</span>
                    )}
                  </td>

                  <td className="py-4">
                    <div className="text-center">
                      <p className="text-[11px] font-black text-[#0f2a44]">{log.operatorName}</p>
                      <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">
                        Certified Audit
                      </p>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {logs.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-[10px] font-black opacity-20 uppercase tracking-widest">
              Sin registros forenses para esta unidad
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForensicJournalTable;
