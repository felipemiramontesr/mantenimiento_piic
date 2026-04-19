import React from 'react';
import {
  Plus,
  ArrowRight,
  PlusCircle,
  Wrench,
  Activity,
  LayoutDashboard,
  Image as ImageIcon,
  RefreshCcw,
  CalendarDays,
  Gauge,
  History,
  Zap,
  ShieldAlert,
  TrendingUp,
  Tag,
  CreditCard,
  MapPin,
} from 'lucide-react';
import { FleetUnit } from '../../types/fleet';
import ArchonGalleryOverlay from './ArchonGalleryOverlay';
import FleetKpiMatrix from './FleetKpiMatrix';
import {
  calculateMaintForecast,
  formatDate,
  MaintenanceForecast,
} from '../../utils/fleetPredictiveEngine';

interface FleetGridViewProps {
  onRegister: () => void;
  units: FleetUnit[];
}

/** 🔱 Archon Helper: Resolve Full Location Names */
const resolveSedeFull = (sede: string | undefined): string => {
  const mapping: Record<string, string> = {
    MA: 'MEDIO AMBIENTE',
    LAB: 'LABORATORIO',
    ADM: 'ADMINISTRACIÓN',
    SEG: 'SEGURIDAD',
    GEO: 'GEOLOGÍA',
    OPS: 'OPERACIONES',
    MAN: 'MANTENIMIENTO',
  };
  const upper = (sede || '').toUpperCase();
  return mapping[upper] || upper || 'SIN SEDE';
};

/** 🔱 Archon Atom: IdentityCluster */
const IdentityCluster: React.FC<{ unit: FleetUnit }> = ({ unit }): React.JSX.Element => (
  <div className="flex flex-col items-center space-y-2">
    <span className="text-[11px] font-black text-[#f2b705] bg-[#0f2a44] px-2 py-0.5 rounded-sm mb-1 tracking-tighter shadow-sm">
      {unit.id}
    </span>
    <div className="flex flex-col items-center leading-tight">
      <span className="text-[10px] font-black text-[#0f2a44] uppercase">{unit.marca}</span>
      <span className="text-[9px] font-bold opacity-40 uppercase">{unit.modelo}</span>
    </div>
    <div className="flex flex-col items-center space-y-1 mt-2">
      <div className="flex items-center gap-1.5 opacity-50 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
        <Tag size={8} />
        <span className="text-[8px] font-black uppercase tracking-tighter">
          {unit.placas || 'SIN PLACAS'}
        </span>
      </div>
      <div className="flex items-center gap-1.5 opacity-60 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
        <CreditCard size={8} />
        <span className="text-[8px] font-black uppercase tracking-tighter">
          T: {unit.tarjeta_circulacion || 'PENDIENTE'}
        </span>
      </div>
      <div className="flex items-center gap-1.5 opacity-50">
        <MapPin size={8} />
        <span className="text-[7.5px] font-black uppercase tracking-widest text-[#0f2a44]">
          {resolveSedeFull(unit.sede)}
        </span>
      </div>
    </div>
  </div>
);

/** 🔱 Archon Atom: StrategyCluster */
const StrategyCluster: React.FC<{ unit: FleetUnit }> = ({ unit }): React.JSX.Element => (
  <div className="flex flex-col items-center space-y-1.5">
    <div className="flex items-center gap-1.5 opacity-60">
      <RefreshCcw size={10} className="text-[#0f2a44]" />
      <span className="text-[9px] font-black text-[#0f2a44]">
        {(unit.maint_interval_km || 10000).toLocaleString()} KM
      </span>
    </div>
    <div className="flex items-center gap-1.5 opacity-40">
      <CalendarDays size={10} />
      <span className="text-[9px] font-bold">{unit.maint_interval_days || 180} DÍAS</span>
    </div>
    <div className="flex items-center gap-1.5 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
      <Activity size={9} className="text-sky-600" />
      <span className="text-[9px] font-black text-sky-700">{unit.avg_daily_km || 0} KM/D</span>
    </div>
  </div>
);

/** 🔱 Archon Atom: TechnicalStatusCluster */
const TechnicalStatusCluster: React.FC<{ unit: FleetUnit }> = ({ unit }): React.JSX.Element => (
  <div className="flex flex-col items-center space-y-2">
    <div className="flex items-center gap-2 bg-[#0f2a44]/5 px-2 py-0.5 rounded-full border border-[#0f2a44]/10">
      <Gauge size={11} className="text-[#0f2a44]" />
      <span className="text-[11px] font-black text-[#0f2a44]">
        {Number(unit.odometer || 0).toLocaleString()}
      </span>
    </div>
    <div className="flex flex-col items-center opacity-40">
      <div className="flex items-center gap-1">
        <History size={9} />
        <span className="text-[9px] font-bold">
          {Number(unit.last_service_reading || 0).toLocaleString()} KM
        </span>
      </div>
      <span className="text-[10px] font-black uppercase text-center">
        {unit.last_service_date ? formatDate(new Date(unit.last_service_date)) : '---'}
      </span>
    </div>
  </div>
);

/** 🔱 Archon Atom: ForecastCluster */
const ForecastCluster: React.FC<{
  forecast: MaintenanceForecast | null;
  isOverdue: boolean;
}> = ({ forecast, isOverdue }): React.JSX.Element => (
  <div
    className={`flex flex-col items-center p-2.5 rounded border transition-all duration-500 min-w-[90px] ${
      isOverdue
        ? 'bg-red-500 border-red-600 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]'
        : 'bg-emerald-50/50 border-emerald-100/50 shadow-sm'
    }`}
  >
    <div className="flex items-center gap-1.5 mb-1">
      {isOverdue ? (
        <ShieldAlert size={12} className="text-white" />
      ) : (
        <TrendingUp size={11} className="text-emerald-600" />
      )}
      <span
        className={`text-[8px] font-black uppercase tracking-widest ${
          isOverdue ? 'text-white' : 'text-emerald-700 opacity-60'
        }`}
      >
        {isOverdue ? 'VENCIDO' : 'PRONÓSTICO'}
      </span>
    </div>
    <span
      className={`text-[13px] font-black tracking-tighter ${
        isOverdue ? 'text-white' : 'text-[#0f2a44]'
      }`}
    >
      {forecast ? formatDate(forecast.forecastDate) : '---'}
    </span>
  </div>
);

/** 🔱 Archon Atom: AdminTile */
const AdminTile: React.FC = (): React.JSX.Element => (
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
);

/** 🔱 Archon Atom: IncorporationTile */
const IncorporationTile: React.FC<{ onRegister: () => void }> = ({
  onRegister,
}): React.JSX.Element => (
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
);

/** 🔱 Archon Atom: MaintenanceTile */
const MaintenanceTile: React.FC = (): React.JSX.Element => (
  <div
    className="glass-card-pro archon-instrument-tile card-hover-sky"
    style={{ borderTop: '4px solid #0ea5e9' }}
  >
    <div className="flex items-center justify-center gap-3 mb-6 w-full">
      <Wrench size={18} />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
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
      <button className="btn-sentinel-sky w-full flex items-center justify-center gap-2 text-xs font-black uppercase">
        Gestión Técnica <ArrowRight size={12} />
      </button>
    </div>
  </div>
);

/** 🔱 Archon Sub-Component: FleetRegistryRow */
const FleetRegistryRow: React.FC<{
  unit: FleetUnit;
  onSelectImage: (unit: FleetUnit) => void;
}> = ({ unit, onSelectImage }): React.JSX.Element => {
  const forecast = calculateMaintForecast(
    unit.maint_interval_days || 180,
    unit.maint_interval_km || 10000,
    unit.avg_daily_km || 30,
    unit.odometer,
    unit.last_service_reading || 0,
    unit.last_service_date || null
  );

  const isOverdue = !!forecast?.isOverdue;

  return (
    <tr
      className={`transition-all duration-300 hover:bg-[#0f2a44]/[0.02] border-b border-gray-50 ${
        isOverdue ? 'bg-red-50/30' : ''
      }`}
    >
      <td className="py-6 text-center">
        <div className="flex justify-center items-center">
          {Array.isArray(unit.images) && unit.images.length > 0 ? (
            <img
              src={unit.images[0]}
              loading="lazy"
              className="w-16 h-16 rounded-[4px] object-cover border border-[#0f2a44]/10 cursor-pointer hover:border-[#0f2a44] transition-colors"
              alt={unit.id}
              onClick={(): void => onSelectImage(unit)}
            />
          ) : (
            <div className="w-16 h-16 rounded-[4px] bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
              <ImageIcon size={24} />
            </div>
          )}
        </div>
      </td>
      <td className="text-center">
        <IdentityCluster unit={unit} />
      </td>
      <td className="text-center">
        <StrategyCluster unit={unit} />
      </td>
      <td className="text-center">
        <TechnicalStatusCluster unit={unit} />
      </td>
      <td className="text-center">
        <div className="flex flex-col items-center space-y-1">
          <div className="flex items-center gap-1.5">
            <Zap
              size={10}
              className={
                forecast && forecast.kmParaServicio < 1000
                  ? 'text-red-500 animate-pulse'
                  : 'text-emerald-500'
              }
            />
            <span
              className={`text-[10px] font-black ${
                forecast && forecast.kmParaServicio < 1000 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {forecast ? forecast.kmParaServicio.toLocaleString() : '---'} KM
            </span>
          </div>
          <div className="flex items-center opacity-50 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
            <span className="text-[10px] font-black uppercase tracking-tighter">
              EST: {forecast ? formatDate(forecast.serviceByKmDate) : '---'}
            </span>
          </div>
        </div>
      </td>
      <td className="text-center">
        <div className="flex justify-center">
          <ForecastCluster forecast={forecast} isOverdue={isOverdue} />
        </div>
      </td>
      <td className="text-center">
        <div className="flex justify-center">
          <FleetKpiMatrix
            availability={unit.availability_index ?? 100}
            mtbf={unit.mtbf_hours ?? 0}
            mttr={unit.mttr_hours ?? 0}
            backlog={unit.backlog_count ?? 0}
          />
        </div>
      </td>
      <td className="text-center">
        <div className="flex items-center justify-center">
          <button
            title="Ver Bitácora"
            className="w-10 h-10 rounded-full bg-[#0f2a44]/5 flex items-center justify-center text-[#0f2a44] hover:bg-[#0f2a44] hover:text-white transition-all shadow-sm border border-[#0f2a44]/10"
          >
            <History size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export const FleetGridView: React.FC<FleetGridViewProps> = ({
  onRegister,
  units = [],
}): React.JSX.Element => {
  const [selectedGalleryUnit, setSelectedGalleryUnit] = React.useState<FleetUnit | null>(null);

  return (
    <div className="animate-in fade-in duration-700 space-y-12 pb-20 text-[#0f2a44]">
      {selectedGalleryUnit && (
        <ArchonGalleryOverlay
          images={selectedGalleryUnit.images || []}
          assetId={selectedGalleryUnit.id}
          onClose={(): void => setSelectedGalleryUnit(null)}
        />
      )}
      <div className="archon-grid-3 gap-5">
        <AdminTile />
        <IncorporationTile onRegister={onRegister} />
        <MaintenanceTile />
      </div>

      <div
        className="glass-card-pro bg-white"
        style={{ borderTop: '4px solid #0f2a44', padding: '40px' }}
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <Activity size={20} />
              <h3 className="text-lg font-black uppercase tracking-widest text-[#0f2a44]">
                Inventario Maestro de Activos
              </h3>
            </div>
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em]">
              Visualización Integrada & Inteligencia Predictiva (Zero-Scroll Mode)
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">
              {units.length} UNIDADES ACTIVAS
            </span>
          </div>
        </div>
        <div className="overflow-hidden">
          <table className="archon-registry-table w-full">
            <thead>
              <tr className="bg-[#0f2a44]/5 border-b border-[#0f2a44]/10">
                <th className="text-center py-4 w-[120px] text-[10px] font-black uppercase opacity-40">
                  ACTIVO
                </th>
                <th className="text-center py-4 text-[10px] font-black uppercase opacity-40">
                  IDENTIDAD
                </th>
                <th className="text-center py-4 text-[10px] font-black uppercase opacity-40">
                  ESTRATEGIA
                </th>
                <th className="text-center py-4 text-[10px] font-black uppercase opacity-40">
                  TÉCNICO
                </th>
                <th className="text-center py-4 text-[10px] font-black uppercase opacity-40">
                  PROGRAMACIÓN
                </th>
                <th className="text-center py-4 text-[10px] font-black uppercase opacity-40">
                  PRONÓSTICO
                </th>
                <th className="text-center py-4 text-[10px] font-black uppercase opacity-40">
                  SALUD
                </th>
                <th className="text-center py-4 text-[10px] font-black uppercase opacity-40">
                  ACCIONES
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {units.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-20 text-center opacity-40 text-xs font-black uppercase"
                  >
                    Sin Assets
                  </td>
                </tr>
              ) : (
                units.map((unit) => (
                  <FleetRegistryRow
                    key={unit.uuid}
                    unit={unit}
                    onSelectImage={(u): void => setSelectedGalleryUnit(u)}
                  />
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
