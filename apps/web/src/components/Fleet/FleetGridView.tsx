import React, { useState } from 'react';
import { 
  Plus, 
  Settings, 
  FileText, 
  Trash2, 
  AlertTriangle, 
  ShieldCheck, 
  Activity,
  ArrowRight,
  Truck
} from 'lucide-react';

interface FleetGridViewProps {
  onRegister: () => void;
  units: Record<string, unknown>[];
}

/**
 * 🔱 Archon Component: FleetGridView
 * Implementation: Silicon Valley Standard (SRP)
 */
export const FleetGridView: React.FC<FleetGridViewProps> = ({ 
  onRegister, 
  units 
}: FleetGridViewProps): React.JSX.Element => {
  const [filter, setFilter] = useState<string>('');

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#0f2a44] rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/10">
            <Activity className="text-[#f2b705]" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#0f2a44] tracking-tight">Gestión de Flotilla</h2>
            <p className="text-sm font-bold text-[#0f2a44] opacity-50 uppercase tracking-widest">
              Panel de Control Operativo
            </p>
          </div>
        </div>

        <button 
          onClick={onRegister}
          className="btn-sentinel-yellow !w-auto px-8 py-4 shadow-xl shadow-yellow-500/10"
        >
          <Plus size={18} className="mr-2" />
          Incorporar Activo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card-pro p-8 space-y-4">
          <div className="flex items-center gap-3 opacity-60">
            <ShieldCheck size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Unidades Activas</span>
          </div>
          <div className="text-4xl font-black text-[#0f2a44]">{units.length}</div>
        </div>
        <div className="glass-card-pro p-8 space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertTriangle size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Mantenimiento</span>
          </div>
          <div className="text-4xl font-black text-[#0f2a44]">0</div>
        </div>
        <div className="glass-card-pro p-8 space-y-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <ShieldCheck size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Disponibilidad</span>
          </div>
          <div className="text-4xl font-black text-[#0f2a44]">100%</div>
        </div>
      </div>

      <div className="glass-card-pro overflow-hidden border border-[rgba(15,42,68,0.05)]">
        <div className="p-6 border-b border-[rgba(15,42,68,0.05)] bg-[#fcfdfe] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Settings size={18} className="text-[#0f2a44] opacity-40" />
            <span className="text-sm font-bold text-[#0f2a44] uppercase tracking-widest">Registro de Activos</span>
          </div>
          <input 
            type="text" 
            placeholder="Buscar por TAG o ID..."
            className="archon-input !w-64 !py-2 !text-xs"
            value={filter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFilter(e.target.value)}
          />
        </div>

        <div className="p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40">Identificador (TAG)</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40">Categoría</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40">Marca / Modelo</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40">Estado</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {units.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <FileText size={48} />
                      <span className="text-sm font-bold uppercase tracking-widest">No hay registros</span>
                    </div>
                  </td>
                </tr>
              ) : (
                units.map((unit: Record<string, unknown>) => (
                  <tr key={unit.id as string} className="border-t border-[rgba(15,42,68,0.03)] hover:bg-[#fcfdfe] transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                          <Truck size={14} />
                        </div>
                        <span className="text-sm font-black text-[#0f2a44]">{unit.tag as string}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-xs font-bold text-[#0f2a44] opacity-60 uppercase">{unit.asset_type as string}</span>
                    </td>
                    <td className="p-6">
                      <span className="text-sm font-bold text-[#0f2a44]">{unit.marca as string} {unit.modelo as string}</span>
                    </td>
                    <td className="p-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">
                        <ShieldCheck size={10} />
                        Disponible
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><Trash2 size={16} /></button>
                        <button className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg"><ArrowRight size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FleetGridView;
