import React from 'react';
import {
  Plus,
  ArrowRight,
  PlusCircle,
  Wrench,
  Activity,
  Tag,
  Gauge,
  Info,
  LayoutDashboard,
  Image as ImageIcon,
} from 'lucide-react';
import { FleetUnit } from '../../types/fleet';

interface FleetGridViewProps {
  onRegister: () => void;
  units: FleetUnit[];
}

/**
 * 🔱 Archon Component: FleetGridView
 * Implementation: PIIC Sovereign Instrument Dashboard (v.18.7.0.0)
 * Aesthetic: Triple-Axis Master Registry + Primary Asset Administration
 */
export const FleetGridView: React.FC<FleetGridViewProps> = ({
  onRegister,
  units = [],
}: FleetGridViewProps): React.JSX.Element => (
  <div className="animate-in fade-in duration-700 space-y-12">
    {/* 🚀 TRIPLE-AXIS INSTRUMENT CLUSTER (Sovereign Grid) */}
    <div className="archon-grid-3 gap-5">
      {/* Instrument 1: Administración de Activos (NAVY) */}
      <div
        className="glass-card-pro archon-instrument-tile card-hover-navy"
        style={{ borderTop: '4px solid #0f2a44' }}
      >
        <div className="flex items-center justify-center gap-3 mb-6 w-full">
          <LayoutDashboard size={18} className="text-[#0f2a44]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-50">
            Gobierno de Inventario
          </span>
        </div>

        <div className="archon-tile-payload space-y-8 pb-12">
          <div className="w-20 h-20 bg-[#0f2a44]/5 rounded-full flex items-center justify-center border-2 border-[#0f2a44]/10 shadow-inner">
            <LayoutDashboard size={32} className="text-[#0f2a44]" />
          </div>
          <div className="flex flex-col items-center space-y-2">
            <h3 className="text-sm font-black text-[#0f2a44] uppercase tracking-widest">
              Administración de Activos
            </h3>
            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest text-center px-4">
              Control Maestro de Flota & Registro
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button className="btn-sentinel-navy w-full flex items-center justify-center gap-2">
            Gestionar Activos <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Instrument 2: Incorporación (VERDE) */}
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
            Iniciar Registro <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Instrument 3: Mantenimiento (AZUL) */}
      <div
        className="glass-card-pro archon-instrument-tile card-hover-sky"
        style={{ borderTop: '4px solid #0ea5e9' }}
      >
        <div className="flex items-center justify-center gap-3 mb-6 w-full">
          <Wrench size={18} className="text-[#0ea5e9]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-50">
            Control Transaccional
          </span>
        </div>

        <div className="archon-tile-payload space-y-8 pb-12">
          <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center border-2 border-sky-100 shadow-inner">
            <Wrench size={32} className="text-[#0ea5e9]" />
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
          <button className="btn-sentinel-sky w-full flex items-center justify-center gap-2">
            Gestión Técnica <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>

    {/* 📊 MASTER REGISTRY TABLE (The Core Node) */}
    <div
      className="glass-card-pro bg-white animate-in slide-in-from-bottom-12 duration-1000"
      style={{ borderTop: '4px solid #0f2a44', padding: '40px' }}
    >
      <div className="flex items-center justify-between mb-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <Activity size={20} className="text-[#0f2a44]" />
            <h3 className="text-lg font-black text-[#0f2a44] uppercase tracking-widest">
              Inventario Maestro de Activos
            </h3>
          </div>
          <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em]">
            Visualización Integrada & Inteligencia Predictiva de Flota
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">
              {units.length} UNIDADES ACTIVAS
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="archon-registry-table w-full">
          <thead>
            <tr>
              <th className="text-center w-[80px]">ACTIVO</th>
              <th className="text-center">NÚMERO ECONÓMICO</th>
              <th className="text-center">MARCA / MODELO</th>
              <th className="text-center">IDENTIDAD</th>
              <th className="text-center">ODÓMETRO / HORAS</th>
              <th className="text-center">SALUD DEL ACTIVO</th>
              <th className="text-center">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {units.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center opacity-40">
                  No hay unidades registradas en el núcleo central.
                </td>
              </tr>
            ) : (
              units.map((unit) => (
                <tr key={unit.uuid} className="group hover:bg-[#f9fbfc] transition-colors">
                  {/* 🖼️ ASSET THUMBNAIL */}
                  <td className="w-[80px]">
                    <div className="flex justify-center items-center">
                      {unit.images && unit.images.length > 0 ? (
                        <img
                          src={unit.images[0]}
                          className="w-12 h-12 rounded-lg object-cover border-2 border-white shadow-sm ring-1 ring-black/5"
                          alt={unit.id}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* MASTER ID (ASM-xxx) */}
                  <td>
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-black text-[#0f2a44] uppercase">
                        {unit.id}
                      </span>
                    </div>
                  </td>

                  {/* MARCA / MODELO */}
                  <td>
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-black text-[#0f2a44] uppercase">
                        {unit.marca}
                      </span>
                      <span className="text-[10px] font-medium opacity-60">{unit.modelo}</span>
                    </div>
                  </td>

                  {/* IDENTITY (PLATES/VIN) */}
                  <td>
                    <div className="flex flex-col items-center space-y-1">
                      <div className="flex items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all">
                        <Tag size={10} className="text-[#0f2a44] opacity-40" />
                        <span className="text-[10px] font-bold text-[#0f2a44] opacity-70">
                          {unit.placas || 'SIN PLACAS'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-30 group-hover:opacity-60 transition-all">
                        <Info size={10} />
                        <span className="text-[9px] font-medium tracking-tight truncate max-w-[120px]">
                          {unit.numero_serie}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* ODOMETER */}
                  <td>
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center gap-1.5">
                        <Gauge size={12} className="text-[#0f2a44] opacity-30" />
                        <span className="text-[11px] font-black text-[#0f2a44]">
                          {unit.current_reading?.toLocaleString() || unit.odometer.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold opacity-30 uppercase tracking-tighter">
                        Kms / Horas
                      </span>
                    </div>
                  </td>

                  {/* PREDICTIVE HEALTH */}
                  <td>
                    <div className="flex flex-col gap-2 w-[180px] mx-auto">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[9px] font-black uppercase tracking-widest"
                          style={{ color: unit.health_color || '#10b981' }}
                        >
                          {unit.health_status || 'HEALTHY'}
                        </span>
                        <span className="text-[10px] font-bold text-[#0f2a44] opacity-40">
                          {unit.health_score ?? 100}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${unit.health_score ?? 100}%`,
                            backgroundColor: unit.health_color || '#10b981',
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* ACTIONS */}
                  <td>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        title="Ver Detalles"
                        className="w-8 h-8 rounded bg-[#0f2a44] flex items-center justify-center text-white hover:bg-[#1a4a7a] transition-colors"
                      >
                        <ArrowRight size={14} />
                      </button>
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

export default FleetGridView;
