import React from 'react';
import { motion } from 'framer-motion';
import { User, Clock, ArrowRight, Gauge, Pencil, CheckCircle2, Navigation } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';

export interface RouteLog {
  id: string;
  unit_id: string;
  operator_id: string;
  origin: string;
  destination: string;
  description?: string;
  fuelLevel?: number;
  start_time: string;
  end_time: string | null;
  start_km: number;
  end_km: number | null;
}

interface RouteLogTableProps {
  onEdit?: (log: RouteLog) => void;
}

/**
 * 🔱 ARCHON ROUTE LOG TABLE
 * Architecture: Sovereign Instrumental Grid (Symmetrical Alignment)
 * Version: 36.5.4 - Operational Rectification Protocol
 */
const RouteLogTable: React.FC<RouteLogTableProps> = ({ onEdit }) => {
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
      description: 'Prueba de sistema inicial',
      fuelLevel: 100,
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
      description: 'Extracción rutinaria',
      fuelLevel: 75,
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
    <div className="glass-card-pro bg-white p-6 animate-in fade-in duration-700">
      <table className="archon-registry-table w-full">
        <thead>
          <tr>
            <th>OPERADOR</th>
            <th>ACTIVO / UNIDAD</th>
            <th>MISIÓN / TRAYECTO</th>
            <th>TELEMETRÍA</th>
            <th>ESTADO</th>
            <th>AJUSTES</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index): React.JSX.Element => {
            const operator = users.find((u) => u.id === log.operator_id);
            const unit = units.find((u) => u.id === log.unit_id);
            const status = getStatus(log);

            return (
              <motion.tr
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Operador */}
                <td className="py-6">
                  <div className="flex items-center justify-center gap-3">
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
                    <div className="text-left">
                      <p className="text-[12px] font-black text-[#0f2a44] leading-tight">
                        {operator?.fullName || 'Operador Externo'}
                      </p>
                      <p className="text-[9px] font-bold text-[#0f2a44] opacity-40 uppercase tracking-tighter">
                        ID: {operator?.employeeNumber || '0000'}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Unidad - CENTRADO */}
                <td className="py-6">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <div className="w-12 h-12 rounded-[4px] border border-[rgba(15,42,68,0.1)] overflow-hidden bg-gray-50 flex items-center justify-center mb-1">
                      <img
                        src={unit?.images?.[0] || 'https://via.placeholder.com/100x100?text=UNIT'}
                        alt="Unit"
                        className="w-full h-full object-cover opacity-80"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[12px] font-black text-[#0f2a44] leading-tight tracking-tighter bg-[#0f2a44]/5 px-2 py-0.5 rounded-[3px] inline-block mb-1">
                        {log.unit_id}
                      </p>
                      <p className="text-[9px] font-bold text-[#0f2a44] opacity-40 uppercase tracking-tighter">
                        {unit?.marca} {unit?.modelo}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Trayecto */}
                <td className="py-6">
                  <div className="flex flex-col items-center space-y-1">
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
                <td className="py-6">
                  <div className="flex flex-col items-center space-y-1">
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
                <td className="py-6">
                  <div className="flex justify-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-[4px] text-[9px] font-black tracking-widest border ${status.bg} ${status.color} ${status.border}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </td>

                {/* Ajustes - ESTILO ADMINISTRACIÓN */}
                <td className="py-6 px-4">
                  <div className="flex justify-center">
                    <button
                      onClick={(): void => onEdit?.(log)}
                      className="flex items-center justify-center w-10 h-10 text-[#059669] bg-emerald-50/30 hover:bg-emerald-100/50 transition-all duration-300 rounded-[4px] hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm group border-none outline-none"
                    >
                      <Pencil
                        size={18}
                        className="transition-transform duration-300 group-hover:rotate-12"
                      />
                    </button>
                  </div>
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
