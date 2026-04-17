import React from 'react';
import { Plus, ArrowRight, PlusCircle, Wrench, Navigation, Activity } from 'lucide-react';
import { FleetUnit } from '../../types/fleet';

interface FleetGridViewProps {
  onRegister: () => void;
  units: FleetUnit[];
}

/**
 * 🔱 Archon Component: FleetGridView
 * Implementation: PIIC Sovereign Instrument Dashboard (v.17.0.2.0)
 * Aesthetic: Triple-Axis Master Registry
 */
export const FleetGridView: React.FC<FleetGridViewProps> = ({
  onRegister,
  units = [],
}: FleetGridViewProps): React.JSX.Element => (
  <div className="space-y-12 animate-in fade-in duration-700">
    {/* 📊 MASTER KPI OVERLAY (v.17.0.2) */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="glass-card-pro p-8 space-y-4 border-l-4 border-[#0f2a44]">
        <div className="flex items-center gap-3 opacity-60">
          <Activity size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]">
            Unidades en Registro
          </span>
        </div>
        <div className="text-4xl font-black text-[#0f2a44] tracking-tighter">{units.length}</div>
      </div>

      <div className="glass-card-pro p-8 space-y-4 border-l-4 border-[#f2b705]">
        <div className="flex items-center gap-3 text-[#f2b705]">
          <Wrench size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Garantía de Servicio
          </span>
        </div>
        <div className="text-4xl font-black text-[#0f2a44] tracking-tighter">100%</div>
      </div>

      <div className="glass-card-pro p-8 space-y-4 border-l-4 border-emerald-500">
        <div className="flex items-center gap-3 text-emerald-600">
          <Navigation size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Estatus Operativo
          </span>
        </div>
        <div className="text-4xl font-black text-[#0f2a44] tracking-tighter uppercase text-[24px]">
          Soberano
        </div>
      </div>
    </div>

    {/* 🚀 TRIPLE-AXIS INSTRUMENT CLUSTER */}
    <div className="archon-grid-3 h-full gap-8">
      {/* Instrument 1: Incorporación (VERDE) */}
      <div
        className="glass-card-pro archon-instrument-tile card-hover-emerald"
        style={{ borderTop: '4px solid #10b981' }}
      >
        <div className="flex items-center justify-center gap-3 mb-6 w-full">
          <Plus size={18} className="text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-50">
            Incorporación de Activos
          </span>
        </div>

        <div className="archon-tile-payload space-y-8 pb-12">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-100 shadow-inner">
            <PlusCircle size={32} className="text-emerald-500" />
          </div>
          <div className="flex flex-col items-center space-y-2">
            <h3 className="text-sm font-black text-[#0f2a44] uppercase tracking-widest">
              Registrar Unidad
            </h3>
            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest text-center px-4">
              Expansión de Flota e Inventario
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button
            onClick={onRegister}
            className="btn-sentinel-emerald w-full flex items-center justify-center gap-2"
          >
            Iniciar Protocolo <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Instrument 2: Mantenimiento (AMARILLO) */}
      <div
        className="glass-card-pro archon-instrument-tile card-hover-yellow"
        style={{ borderTop: '4px solid #f2b705' }}
      >
        <div className="flex items-center justify-center gap-3 mb-6 w-full">
          <Wrench size={18} className="text-[#f2b705]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-50">
            Control Transaccional
          </span>
        </div>

        <div className="archon-tile-payload space-y-8 pb-12">
          <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center border-2 border-yellow-100 shadow-inner">
            <Wrench size={32} className="text-[#f2b705]" />
          </div>
          <div className="flex flex-col items-center space-y-2">
            <h3 className="text-sm font-black text-[#0f2a44] uppercase tracking-widest">
              Mantenimiento
            </h3>
            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest text-center px-4">
              Correctivos y Preventivos
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button className="btn-sentinel-yellow w-full flex items-center justify-center gap-2">
            Gestión Técnica <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Instrument 3: Logística (AZUL) */}
      <div
        className="glass-card-pro archon-instrument-tile card-hover-sky"
        style={{ borderTop: '4px solid #0ea5e9' }}
      >
        <div className="flex items-center justify-center gap-3 mb-6 w-full">
          <Navigation size={18} className="text-sky-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-50">
            Despliegue Operativo
          </span>
        </div>

        <div className="archon-tile-payload space-y-8 pb-12">
          <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center border-2 border-sky-100 shadow-inner">
            <Navigation size={32} className="text-sky-500" />
          </div>
          <div className="flex flex-col items-center space-y-2">
            <h3 className="text-sm font-black text-[#0f2a44] uppercase tracking-widest">
              Asignación
            </h3>
            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest text-center px-4">
              Administración de Operadores
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button className="btn-sentinel-sky w-full flex items-center justify-center gap-2">
            Iniciar Logística <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default FleetGridView;
