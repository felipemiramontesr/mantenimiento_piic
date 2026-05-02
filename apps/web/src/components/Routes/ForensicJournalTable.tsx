import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, ArrowRight, Activity, TrendingUp } from 'lucide-react';
import api from '../../api/client';

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

/**
 * 🔱 ARCHON FORENSIC JOURNAL TABLE
 * Purpose: Immutable trace of all asset impacts and telemetery deltas.
 * Version: 1.0.0 - Sovereign Forensic Audit
 */
const ForensicJournalTable: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (): Promise<void> => {
    try {
      const res = await api.get('/unit-logs');
      setLogs(res.data?.data || []);
    } catch (err) {
      // Sovereign silence
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getEventStyle = (
    type: string
  ): { label: string; color: string; bg: string; icon: React.ElementType } => {
    switch (type) {
      case 'ROUTE_START':
        return { label: 'SALIDA', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: Activity };
      case 'ROUTE_FINISH':
        return { label: 'ENTRADA', color: 'text-blue-500', bg: 'bg-blue-50', icon: Shield };
      default:
        return { label: 'EVENTO', color: 'text-gray-500', bg: 'bg-gray-50', icon: Clock };
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-[#0f2a44] font-black animate-pulse uppercase tracking-widest text-xs">
          Accediendo a Memoria Forense...
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card-pro bg-white p-6 animate-in fade-in duration-700">
      <div className="flex items-center gap-3 mb-6 border-b pb-4 border-[#0f2a44]/5">
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

      <table className="archon-registry-table w-full">
        <thead>
          <tr>
            <th>FECHA / HORA</th>
            <th>ACTIVO</th>
            <th>EVENTO / IMPACTO</th>
            <th>TELEMETRÍA (SNAPSHOT)</th>
            <th>DELTA</th>
            <th>RESPONSABLE</th>
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
                {/* Fecha */}
                <td className="py-4">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-[#0f2a44]">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-[9px] font-bold opacity-40 uppercase">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </td>

                {/* Activo */}
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

                {/* Evento */}
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

                {/* Snapshot Telemetría */}
                <td className="py-4">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-bold opacity-60">
                      {log.reading_before?.toLocaleString()}
                    </span>
                    <ArrowRight size={10} className="opacity-20" />
                    <span className="text-[11px] font-black text-[#0f2a44]">
                      {log.reading_after?.toLocaleString() || '---'}
                    </span>
                    <span className="text-[9px] font-bold opacity-30">KM/H</span>
                  </div>
                </td>

                {/* Delta */}
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

                {/* Responsable */}
                <td className="py-4">
                  <div className="text-center">
                    <p className="text-[11px] font-black text-[#0f2a44]">{log.operatorName}</p>
                    <p className="text-[9px] font-bold opacity-40 uppercase">Archon Certified</p>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>

      {logs.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-[10px] font-black opacity-20 uppercase tracking-widest">
            No se han registrado impactos forenses aún.
          </p>
        </div>
      )}
    </div>
  );
};

export default ForensicJournalTable;
