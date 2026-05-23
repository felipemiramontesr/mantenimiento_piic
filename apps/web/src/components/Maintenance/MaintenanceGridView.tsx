import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { MaintenanceLog } from '../../types/maintenance';
import api from '../../api/client';
import { ArchonTableSkeleton } from '../ArchonSkeleton';
import { formatDate } from '../../utils/dateUtils';

interface MaintenanceGridViewProps {
  refreshTrigger: number;
  onNewRequest: () => void;
}

const MaintenanceGridView: React.FC<MaintenanceGridViewProps> = ({ refreshTrigger, onNewRequest: _onNewRequest }) => {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await api.get('/maintenance?limit=50');
        if (response.data.success) {
          setLogs(response.data.data);
        }
      } catch (err) {
        setError('Error al recuperar registros de mantenimiento.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [refreshTrigger]);

  if (loading) return <ArchonTableSkeleton rows={6} />;
  if (error) return <div className="p-4 text-[#C12020] font-mono text-sm">{error}</div>;

  return (
    <div className="bg-white rounded border border-[#0f2a44]/10 shadow-sm overflow-hidden">
      <div className="flex flex-row justify-between items-center p-4 border-b border-[#0f2a44]/10">
        <h2 className="text-[#0f2a44] font-black text-lg">Historial de Servicios</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0f2a44]/5 text-[#0f2a44]/60 text-[10px] uppercase font-black tracking-widest border-b border-[#0f2a44]/10">
              <th className="py-3 px-4 w-12">ID</th>
              <th className="py-3 px-4">Unidad</th>
              <th className="py-3 px-4">Tipo Servicio</th>
              <th className="py-3 px-4">Odómetro</th>
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4 text-right">Costo</th>
            </tr>
          </thead>
          <tbody className="text-sm font-medium text-[#0f2a44]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#0f2a44]/40 font-black tracking-wide">
                  NO SE ENCONTRARON REGISTROS
                </td>
              </tr>
            ) : (
              logs.map((log, index) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="border-b border-[#0f2a44]/10 last:border-0 group"
                >
                  <td className="py-3 px-4 font-mono text-xs opacity-60">#{log.id}</td>
                  <td className="py-3 px-4">
                    <div className="font-black">{log.unit_id}</div>
                    <div className="text-[10px] opacity-60 uppercase">{log.placas}</div>
                  </td>
                  <td className="py-3 px-4">
                    {log.service_type === 'MINOR_MINING' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 text-xs font-bold border border-emerald-500/20">
                         Mina Menor
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0f2a44]/10 text-[#0f2a44] text-xs font-bold border border-[#0f2a44]/20">
                         Preventivo
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">{Number(log.odometer_at_service).toLocaleString()} km</td>
                  <td className="py-3 px-4 whitespace-nowrap">{formatDate(log.service_date)}</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">
                    ${Number(log.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaintenanceGridView;
