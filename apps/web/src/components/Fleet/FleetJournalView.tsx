import React from 'react';
import { Shield, ArrowUpRight, ArrowDownLeft, Info } from 'lucide-react';
import { formatDateTime } from '../../utils/dateUtils';

interface JournalEntry {
  id: string;
  timestamp: Date;
  event: 'SALIDA' | 'ENTRADA';
  description: string;
  telemetry: string;
  delta?: string;
  responsible: string;
}

interface FleetJournalViewProps {
  unitId: string;
}

const FleetJournalView: React.FC<FleetJournalViewProps> = ({ unitId }) => {
  // Mock data representing the "Journal de Activos" from the image
  const entries: JournalEntry[] = [
    {
      id: '1',
      timestamp: new Date('2026-05-06T22:41:00'),
      event: 'SALIDA',
      description: 'Sin descripción forense',
      telemetry: '53480.00 KM',
      responsible: 'Juan Carlos Piloto',
    },
    {
      id: '2',
      timestamp: new Date('2026-05-06T22:35:00'),
      event: 'ENTRADA',
      description: 'Sin descripción forense',
      telemetry: '357833.00 → 357900.00 KM',
      delta: '+67',
      responsible: 'Lic. Adriana Mendoza',
    },
    {
      id: '3',
      timestamp: new Date('2026-05-06T22:34:00'),
      event: 'SALIDA',
      description: 'Sin descripción forense',
      telemetry: '357833.00 KM',
      responsible: 'Lic. Adriana Mendoza',
    },
  ];

  return (
    <div className="p-8 bg-slate-50/50 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Shield size={20} className="text-amber-500" />
        <div className="flex flex-col">
          <h3 className="text-[14px] font-black text-navy-900 uppercase tracking-widest">
            Journal de Activos: {unitId}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            Rastro Inmutable de Operaciones y Desgaste
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[4px] border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-navy-900 text-white text-[10px] font-black uppercase tracking-widest">
              <th className="px-6 py-4">Fecha / Hora</th>
              <th className="px-6 py-4">Evento / Impacto</th>
              <th className="px-6 py-4">Descripción / Nota</th>
              <th className="px-6 py-4">Telemetría (Snapshot)</th>
              <th className="px-6 py-4 text-center">Delta</th>
              <th className="px-6 py-4">Responsable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-[12px] font-black text-navy-800">
                    {formatDateTime(entry.timestamp)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-[4px] text-[10px] font-black border ${
                      entry.event === 'SALIDA'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        : 'bg-sky-50 border-sky-100 text-sky-600'
                    }`}
                  >
                    {entry.event === 'SALIDA' ? (
                      <ArrowUpRight size={12} />
                    ) : (
                      <ArrowDownLeft size={12} />
                    )}
                    {entry.event}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 italic text-[11px] text-slate-400">
                    <Info size={12} />
                    {entry.description}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[12px] font-mono font-bold text-navy-700">
                    {entry.telemetry}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {entry.delta ? (
                    <span className="text-[12px] font-black text-rose-500">{entry.delta}</span>
                  ) : (
                    <span className="text-slate-300">---</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-black text-navy-900">
                      {entry.responsible}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                      Archon Certified
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FleetJournalView;
