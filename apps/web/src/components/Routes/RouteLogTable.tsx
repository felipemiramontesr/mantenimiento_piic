import React from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Clock,
  ArrowRight,
  Gauge,
  MoreVertical,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';

interface RouteLog {
  id: string;
  unit_id: string;
  operator_id: string;
  origin: string;
  destination: string;
  start_time: string;
  end_time: string | null;
  start_km: number;
  end_km: number | null;
}

/**
 * 🔱 ARCHON ROUTE LOG TABLE
 * Architecture: Sovereign Instrumental Grid
 * Purpose: High-density visualization of operational history.
 */
const RouteLogTable: React.FC = () => {
  const { units } = useFleet();
  const { users } = useUsers();

  // MOCK DATA (based on the provided JSON dump)
  const [logs] = React.useState<RouteLog[]>([
    {
      id: '63',
      unit_id: 'ASM-002',
      operator_id: '1',
      origin: 'Base Arian',
      destination: 'Test Route - Day Zero Baseline',
      start_time: '2026-03-09 00:00:00',
      end_time: '2026-04-01 00:00:00',
      start_km: 119728,
      end_km: 120568,
    },
    {
      id: '64',
      unit_id: 'ASM-006',
      operator_id: '1',
      origin: 'Base Arian',
      destination: 'Mina Nivel 200',
      start_time: '2026-03-11 00:00:00',
      end_time: null, // Active
      start_km: 356944,
      end_km: null,
    },
  ]);

  const getStatus = (
    log: RouteLog
  ): { label: string; color: string; bg: string; border: string } => {
    if (!log.end_time)
      return {
        label: 'EN RUTA',
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
      };
    return {
      label: 'FINALIZADA',
      color: 'text-[#0f2a44]',
      bg: 'bg-[#0f2a44]/5',
      border: 'border-[#0f2a44]/10',
    };
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-[rgba(15,42,68,0.05)] overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#0f2a44]/[0.02] border-b border-[rgba(15,42,68,0.05)]">
            <th className="px-6 py-4 text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40">
                Operador
              </span>
            </th>
            <th className="px-6 py-4 text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40">
                Activo / Unidad
              </span>
            </th>
            <th className="px-6 py-4 text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40">
                Misión / Trayecto
              </span>
            </th>
            <th className="px-6 py-4 text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40">
                Telemetría
              </span>
            </th>
            <th className="px-6 py-4 text-center">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40">
                Estado
              </span>
            </th>
            <th className="px-6 py-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(15,42,68,0.03)]">
          {logs.map((log, index): React.JSX.Element => {
            const operator = users.find((u) => u.id === log.operator_id);
            const unit = units.find((u) => u.id === log.unit_id);
            const status = getStatus(log);

            return (
              <motion.tr
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-[rgba(15,42,68,0.01)] transition-colors group"
              >
                {/* Operador */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100">
                        <img
                          src={
                            operator?.imageUrl ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${log.operator_id}`
                          }
                          alt="Operator"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-xs flex items-center justify-center">
                        <User size={8} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-[#0f2a44] leading-tight">
                        {operator?.fullName || 'Operador Externo'}
                      </p>
                      <p className="text-[9px] font-bold text-[#0f2a44] opacity-40 uppercase tracking-tighter">
                        ID: {operator?.employeeNumber || '0000'}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Unidad */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded border border-[rgba(15,42,68,0.1)] overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img
                        src={unit?.images?.[0] || 'https://via.placeholder.com/100x100?text=UNIT'}
                        alt="Unit"
                        className="w-full h-full object-cover opacity-80"
                      />
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-[#0f2a44] leading-tight">
                        {log.unit_id}
                      </p>
                      <p className="text-[9px] font-bold text-[#0f2a44] opacity-40 uppercase tracking-tighter">
                        {unit?.marca} {unit?.modelo}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Trayecto */}
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Navigation size={12} className="text-emerald-500" />
                      <p className="text-[11px] font-black text-[#0f2a44] tracking-tight">
                        {log.destination}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 opacity-40">
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        <span className="text-[9px] font-bold uppercase">
                          {new Date(log.start_time).toLocaleDateString()}
                        </span>
                      </div>
                      <ArrowRight size={8} />
                      <span className="text-[9px] font-bold uppercase">
                        {log.origin || 'Base Arian'}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Telemetría */}
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Gauge size={12} className="text-[#0f2a44]/30" />
                      <p className="text-[11px] font-black text-[#0f2a44]">
                        {log.start_km.toLocaleString()} <span className="opacity-40">KM</span>
                      </p>
                    </div>
                    {log.end_km && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <p className="text-[11px] font-black text-[#0f2a44]">
                          {log.end_km.toLocaleString()} <span className="opacity-40">KM</span>
                        </p>
                      </div>
                    )}
                  </div>
                </td>

                {/* Estado */}
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded text-[9px] font-black tracking-widest border ${status.bg} ${status.color} ${status.border}`}
                  >
                    {status.label}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-[rgba(15,42,68,0.05)] rounded transition-colors text-[#0f2a44]/40 hover:text-[#0f2a44]">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RouteLogTable;
