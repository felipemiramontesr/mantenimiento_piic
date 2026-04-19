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
  Fuel,
  Settings2,
  Users,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';
import { FleetUnit } from '../../types/fleet';
import ArchonGalleryOverlay from './ArchonGalleryOverlay';
import FleetKpiMatrix from './FleetKpiMatrix';

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
}: FleetGridViewProps): React.JSX.Element => {
  const [selectedGalleryUnit, setSelectedGalleryUnit] = React.useState<FleetUnit | null>(null);

  return (
    <div className="animate-in fade-in duration-700 space-y-12">
      {/* 🔱 ARCHON GALLERY OVERLAY (Injected on demand) */}
      {selectedGalleryUnit && (
        <ArchonGalleryOverlay
          images={selectedGalleryUnit.images || []}
          assetId={selectedGalleryUnit.id}
          onClose={(): void => setSelectedGalleryUnit(null)}
        />
      )}

      {/* 🚀 TRIPLE-AXIS INSTRUMENT CLUSTER (Sovereign Grid) */}
      <div className="archon-grid-3 gap-5">
        {/* ... (Keep Instruments 1-3 as is) ... */}
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
                <th className="text-center w-[100px]">ACTIVO</th>
                <th className="text-center">IDENTIDAD</th>
                <th className="text-center">LEGALES</th>
                <th className="text-center">CONFIGURACIÓN</th>
                <th className="text-center">OPERACIÓN</th>
                <th className="text-center">SALUD (DISP/MTTR...)</th>
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
                  <tr key={unit.uuid} className="transition-all duration-300">
                    {/* 🖼️ ASSET THUMBNAIL */}
                    <td className="w-[120px]">
                      <div className="flex justify-center items-center py-4">
                        {Array.isArray(unit.images) && unit.images.length > 0 ? (
                          <img
                            src={unit.images[0]}
                            loading="lazy"
                            className="w-20 h-20 rounded-[4px] object-cover aspect-square border border-[#0f2a44]/10 cursor-pointer hover:border-[#0f2a44] transition-colors"
                            alt={unit.id}
                            onClick={(): void => setSelectedGalleryUnit(unit)}
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-[4px] bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 aspect-square">
                            <ImageIcon size={28} />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* IDENTIDAD (ID, Marca, Modelo, Año) */}
                    <td>
                      <div className="flex flex-col items-center">
                        <span className="text-[12px] font-black text-[#f2b705] bg-[#0f2a44] px-2 py-0.5 rounded-sm mb-1 tracking-tighter">
                          {unit.id}
                        </span>
                        <span className="text-[11px] font-black text-[#0f2a44] uppercase leading-tight">
                          {unit.marca}
                        </span>
                        <span className="text-[10px] font-bold opacity-60 uppercase leading-tight">
                          {unit.modelo}
                        </span>
                        <div className="flex items-center gap-1 mt-1 opacity-40">
                          <span className="text-[8px] font-bold uppercase tracking-tighter">
                            MODELO {unit.year}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* LEGALES (Placas, Tarjeta Circulación, Serie) */}
                    <td>
                      <div className="flex flex-col items-center space-y-1.5">
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100 w-full justify-center">
                          <Tag size={10} className="text-[#0f2a44] opacity-40" />
                          <span className="text-[10px] font-black text-[#0f2a44]">
                            {unit.placas || 'S/P'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-60">
                          <ShieldCheck size={10} className="text-[#0f2a44]" />
                          <span className="text-[9px] font-bold tracking-tight">
                            {unit.tarjeta_circulacion || 'S/TC'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-20">
                          <Info size={9} />
                          <span className="text-[8px] font-medium truncate max-w-[80px]">
                            {unit.numero_serie}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* CONFIGURACIÓN (Combo: Fuel, Drive, Trans) */}
                    <td>
                      <div className="flex flex-col items-center space-y-1.5">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <Fuel size={10} className="text-[#0f2a44] opacity-30 mb-0.5" />
                            <span className="text-[8px] font-black uppercase text-[#0f2a44]">
                              {unit.fuel_type || 'N/A'}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Settings2 size={10} className="text-[#0f2a44] opacity-30 mb-0.5" />
                            <span className="text-[8px] font-black uppercase text-[#0f2a44]">
                              {unit.traccion || 'N/A'}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <HardDrive size={10} className="text-[#0f2a44] opacity-30 mb-0.5" />
                            <span className="text-[8px] font-black uppercase text-[#0f2a44]">
                              {unit.transmision?.substring(0, 3) || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* OPERACIÓN (Odómetro, Status, Depto, Uso) */}
                    <td>
                      <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center gap-2">
                          <Gauge size={11} className="text-[#0f2a44] opacity-30" />
                          <span className="text-[11px] font-black text-[#0f2a44]">
                            {unit.odometer.toLocaleString()}
                          </span>
                          <span className="text-[8px] font-bold opacity-30">KM</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1 opacity-50 mb-0.5">
                            <Users size={9} />
                            <span className="text-[8px] font-black uppercase tracking-tighter">
                              {unit.departamento || 'OPERACIONES'}
                            </span>
                          </div>
                          <div className="px-3 py-0.5 bg-[#f2b705]/10 border border-[#f2b705]/20 rounded-full">
                            <span className="text-[8px] font-bold text-[#0f2a44] uppercase tracking-tighter">
                              {unit.uso || 'USO GENERAL'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 📊 ANALYTICAL HEALTH (KPI Matrix) */}
                    <td>
                      <div className="flex justify-center">
                        <FleetKpiMatrix
                          availability={unit.availability_index ?? 100}
                          mtbf={unit.mtbf_hours ?? 0}
                          mttr={unit.mttr_hours ?? 0}
                          backlog={unit.backlog_count ?? 0}
                        />
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
};

export default FleetGridView;
