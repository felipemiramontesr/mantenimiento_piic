import React from 'react';
import {
  Activity,
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
  ChevronUp,
  ChevronDown,
  Compass,
} from 'lucide-react';
import { FleetUnit } from '../../types/fleet';
import ArchonGalleryOverlay from './ArchonGalleryOverlay';
import FleetKpiMatrix from './FleetKpiMatrix';
import RouteManagerSlideOver from './RouteManagerSlideOver';
import {
  calculateMaintForecast,
  formatDate,
  MaintenanceForecast,
} from '../../utils/fleetPredictiveEngine';

interface FleetGridViewProps {
  units: FleetUnit[];
}

const resolveAreaFull = (code: string | undefined): string => {
  const mapping: Record<string, string> = {
    MA: 'MEDIO AMBIENTE',
    LAB: 'LABORATORIO',
    ADM: 'ADMINISTRACIÓN',
    SEG: 'SEGURIDAD',
    GEO: 'GEOLOGÍA',
    OPS: 'OPERACIONES',
    MAN: 'MANTENIMIENTO',
    GER: 'GERENCIA',
  };
  const key = (code || '').toUpperCase();
  return mapping[key] || 'GENERAL';
};

const processTechnicalIdentity = (modelStr: string): { cleanModel: string; areaFull: string } => {
  const match = modelStr.match(/\s(MA|LAB|ADM|SEG|GEO|OPS|MAN|GER)$/i);
  const [, areaCode = ''] = match || [];
  const cleanModel = modelStr.replace(/\s(MA|LAB|ADM|SEG|GEO|OPS|MAN|GER)$/i, '').trim();
  return { cleanModel: cleanModel.toUpperCase(), areaFull: resolveAreaFull(areaCode) };
};

const AssetUnitCluster = ({ unit }: { unit: FleetUnit }): React.JSX.Element => {
  const identity = processTechnicalIdentity(unit.modelo);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[11px] font-black text-[#f2b705] bg-[#0f2a44] px-2 py-0.5 rounded-[4px] tracking-tighter">
        {unit.id}
      </span>
      <div className="flex flex-col items-center -space-y-0.5">
        <span className="text-[11px] font-black text-[#0f2a44] uppercase tracking-tight">
          {unit.marca}
        </span>
        <span className="text-[10px] font-bold text-[#0f2a44] opacity-50 uppercase tracking-tight">
          {identity.cleanModel}
        </span>
      </div>
      <span className="text-[9px] font-black text-[#0f2a44] uppercase tracking-widest opacity-80">
        {identity.areaFull}
      </span>
    </div>
  );
};

const AssetIdentityCluster = ({ unit }: { unit: FleetUnit }): React.JSX.Element => {
  const plates = unit.placas || 'SIN PLACAS';
  const card = unit.tarjetaCirculacion || 'SIN TARJETA';
  const location = unit.sede || 'SEDE GENERAL';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5 opacity-80 bg-emerald-50 px-2 py-0.5 rounded-[4px]">
          <Tag size={9} className="text-emerald-800" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-800">
            {plates}
          </span>
        </div>
        <div className="flex items-center gap-1.5 opacity-80 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-[4px]">
          <CreditCard size={9} />
          <span className="text-[9px] font-black uppercase tracking-tighter">{card}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 bg-sky-50 px-2 py-0.5 rounded-[4px]">
        <MapPin size={9} className="text-sky-600" />
        <span className="text-[8.5px] font-black text-sky-800 uppercase tracking-tight leading-none">
          {location}
        </span>
      </div>
    </div>
  );
};

const StrategyCluster = ({ unit }: { unit: FleetUnit }): React.JSX.Element => {
  const intervalKm = unit.maintIntervalKm || 10000;
  const intervalDays = unit.maintIntervalDays || 180;
  const avgDaily = unit.avgDailyKm || 0;
  return (
    <div className="flex flex-col items-center space-y-1.5">
      <div className="flex items-center gap-1.5 opacity-60">
        <RefreshCcw size={10} className="text-[#0f2a44]" />
        <span className="text-[9px] font-black text-[#0f2a44]">
          {intervalKm.toLocaleString()} KM
        </span>
      </div>
      <div className="flex items-center gap-1.5 opacity-40">
        <CalendarDays size={10} />
        <span className="text-[9px] font-bold">{intervalDays} DÍAS</span>
      </div>
      <div className="flex items-center gap-1.5 bg-sky-50 px-1.5 py-0.5 rounded-[4px]">
        <Activity size={9} className="text-sky-600" />
        <span className="text-[9px] font-black text-sky-700">{avgDaily} KM/D</span>
      </div>
    </div>
  );
};

const TechnicalStatusCluster = ({ unit }: { unit: FleetUnit }): React.JSX.Element => {
  const odometer = unit.odometer || 0;
  const lastReading = unit.lastServiceReading || 0;
  let serviceDateStr = '---';
  if (unit.lastServiceDate) {
    serviceDateStr = formatDate(new Date(unit.lastServiceDate));
  }
  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="flex items-center gap-2 bg-sky-50 px-3 py-0.5 rounded-[4px]">
        <Gauge size={12} className="text-sky-600" />
        <span className="text-[12px] font-black text-sky-800">{odometer.toLocaleString()}</span>
      </div>
      <div className="flex flex-col items-center opacity-40">
        <div className="flex items-center gap-1">
          <History size={9} />
          <span className="text-[9px] font-bold">{lastReading.toLocaleString()} KM</span>
        </div>
        <span className="text-[10px] font-black uppercase text-center">{serviceDateStr}</span>
      </div>
    </div>
  );
};

const ForecastCluster = ({
  forecast,
  isOverdue,
}: {
  forecast: MaintenanceForecast | null;
  isOverdue: boolean;
}): React.JSX.Element => {
  let containerClass = 'bg-emerald-50/50';
  let textClass = 'text-emerald-700 opacity-60';
  let valClass = 'text-[#0f2a44]';
  let labelText = 'PRONÓSTICO';
  if (isOverdue) {
    containerClass = 'bg-red-500';
    textClass = 'text-white';
    valClass = 'text-white';
    labelText = 'VENCIDO';
  }
  let dateStr = '---';
  if (forecast) {
    dateStr = formatDate(forecast.forecastDate);
  }
  return (
    <div
      className={`flex flex-col items-center p-2.5 rounded-[4px] transition-all duration-500 min-w-[90px] ${containerClass}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {isOverdue ? (
          <ShieldAlert size={12} className="text-white" />
        ) : (
          <TrendingUp size={11} className="text-emerald-600" />
        )}
        <span className={`text-[8px] font-black uppercase tracking-widest ${textClass}`}>
          {labelText}
        </span>
      </div>
      <span className={`text-[13px] font-black tracking-tighter ${valClass}`}>{dateStr}</span>
    </div>
  );
};

const FleetRegistryRow = ({
  unit,
  onSelectImage,
  onManageRoute,
}: {
  unit: FleetUnit;
  onSelectImage: (u: FleetUnit) => void;
  onManageRoute: (u: FleetUnit) => void;
}): React.JSX.Element => {
  const forecast = calculateMaintForecast(
    unit.maintIntervalDays || 180,
    unit.maintIntervalKm || 10000,
    unit.avgDailyKm || 30,
    unit.odometer,
    unit.lastServiceReading || 0,
    unit.lastServiceDate || null
  );
  const isOverdue = !!forecast?.isOverdue;
  let rowClass = 'transition-all duration-300 hover:bg-[#0f2a44]/[0.02] border-b border-gray-50';
  if (isOverdue) {
    rowClass = `${rowClass} bg-red-50/30`;
  }

  let zapClass = 'text-emerald-500';
  let kmTextClass = 'text-emerald-700';
  if (forecast && forecast.kmParaServicio < 1000) {
    zapClass = 'text-red-500';
    kmTextClass = 'text-red-600';
  }

  let statusStyles = 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed';
  if (unit.status === 'Disponible') {
    statusStyles = 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white';
  }
  if (unit.status === 'Asignada') {
    statusStyles = 'bg-amber-500 text-white hover:bg-amber-700';
  }
  if (unit.status === 'En Ruta') {
    statusStyles = 'bg-emerald-600 text-white hover:bg-emerald-800';
  }

  const hasImages = Array.isArray(unit.images) && unit.images.length > 0;

  return (
    <tr className={rowClass}>
      <td className="py-6 text-center">
        <div className="flex justify-center items-center">
          {hasImages ? (
            <img
              src={unit.images![0]}
              className="w-48 h-48 rounded-[4px] object-cover border border-[#0f2a44]/10 cursor-pointer hover:border-[#0f2a44]"
              alt={unit.id}
              onClick={(): void => onSelectImage(unit)}
            />
          ) : (
            <div className="w-48 h-48 rounded-[4px] bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
              <ImageIcon size={48} />
            </div>
          )}
        </div>
      </td>
      <td className="text-center px-3">
        <AssetUnitCluster unit={unit} />
      </td>
      <td className="text-center px-3">
        <AssetIdentityCluster unit={unit} />
      </td>
      <td className="text-center px-4">
        <StrategyCluster unit={unit} />
      </td>
      <td className="text-center px-4">
        <TechnicalStatusCluster unit={unit} />
      </td>
      <td className="text-center px-4">
        <div className="flex flex-col items-center space-y-1">
          <div className="flex items-center gap-1.5">
            <Zap size={10} className={zapClass} />
            <span className={`text-[10px] font-black ${kmTextClass}`}>
              {forecast ? forecast.kmParaServicio.toLocaleString() : '---'} KM
            </span>
          </div>
          <div className="flex items-center opacity-50 bg-gray-50 px-2 py-0.5 rounded-[4px]">
            <span className="text-[10px] font-black uppercase tracking-tighter">
              EST: {forecast ? formatDate(forecast.serviceByKmDate) : '---'}
            </span>
          </div>
        </div>
      </td>
      <td className="text-center px-4">
        <div className="flex justify-center">
          <ForecastCluster forecast={forecast} isOverdue={isOverdue} />
        </div>
      </td>
      <td className="text-center px-4">
        <div className="flex justify-center">
          <FleetKpiMatrix
            availability={unit.availabilityIndex ?? 100}
            mtbf={unit.mtbfHours ?? 0}
            mttr={unit.mttrHours ?? 0}
            backlog={unit.backlogCount ?? 0}
          />
        </div>
      </td>
      <td className="text-center px-4">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(): void => onManageRoute(unit)}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-[4px] font-black text-[10px] uppercase transition-all ${statusStyles}`}
          >
            {unit.status === 'Disponible' && (
              <>
                <Compass size={12} /> Despachar
              </>
            )}
            {unit.status === 'Asignada' && (
              <>
                <Zap size={12} /> Iniciar
              </>
            )}
            {unit.status === 'En Ruta' && (
              <>
                <History size={12} /> Concluir
              </>
            )}
          </button>
        </div>
      </td>
    </tr>
  );
};

export const FleetGridView = ({ units = [] }: FleetGridViewProps): React.JSX.Element => {
  const [selectedGalleryUnit, setSelectedGalleryUnit] = React.useState<FleetUnit | null>(null);
  const [selectedRouteUnit, setSelectedRouteUnit] = React.useState<FleetUnit | null>(null);
  const [sortConfig, setSortConfig] = React.useState<{
    field: 'unidad' | 'programacion' | 'pronostico' | 'acciones' | null;
    direction: 'asc' | 'desc';
  }>({ field: null, direction: 'asc' });

  const sortedUnits = React.useMemo((): FleetUnit[] => {
    if (!sortConfig.field) return units;
    const unitsMap = units.map((u) => ({
      unit: u,
      forecast: calculateMaintForecast(
        u.maintIntervalDays || 180,
        u.maintIntervalKm || 10000,
        u.avgDailyKm || 30,
        u.odometer,
        u.lastServiceReading || 0,
        u.lastServiceDate || null
      ),
    }));
    return [...unitsMap]
      .sort((a, b): number => {
        let valA = 0;
        let valB = 0;
        if (sortConfig.field === 'unidad') {
          valA = parseInt(a.unit.id.replace(/\D/g, ''), 10) || 0;
          valB = parseInt(b.unit.id.replace(/\D/g, ''), 10) || 0;
        } else if (sortConfig.field === 'programacion') {
          valA = a.forecast ? a.forecast.kmParaServicio : Infinity;
          valB = b.forecast ? b.forecast.kmParaServicio : Infinity;
        } else if (sortConfig.field === 'pronostico') {
          valA = a.forecast ? a.forecast.forecastDate.getTime() : Infinity;
          valB = b.forecast ? b.forecast.forecastDate.getTime() : Infinity;
        } else if (sortConfig.field === 'acciones') {
          const actionWeight: Record<string, number> = {
            Disponible: 1, // Despachar
            Asignada: 2, // Iniciar
            'En Ruta': 3, // Concluir
          };
          valA = actionWeight[a.unit.status] || 4;
          valB = actionWeight[b.unit.status] || 4;
        }
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      })
      .map((item) => item.unit);
  }, [units, sortConfig]);

  const handleSort = (field: 'unidad' | 'programacion' | 'pronostico' | 'acciones'): void => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIndicator = ({
    active,
    direction,
  }: {
    active: boolean;
    direction: 'asc' | 'desc';
  }): React.JSX.Element => (
    <span
      className={`inline-flex ml-1 transition-all duration-300 ${
        active ? 'opacity-100 text-[#059669]' : 'opacity-80 text-[#10b981]'
      }`}
    >
      {active && direction === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
    </span>
  );

  return (
    <div className="animate-in fade-in duration-700 space-y-[20px] text-[#0f2a44]">
      {selectedGalleryUnit && (
        <ArchonGalleryOverlay
          images={selectedGalleryUnit.images || []}
          assetId={selectedGalleryUnit.id}
          onClose={(): void => setSelectedGalleryUnit(null)}
        />
      )}
      {selectedRouteUnit && (
        <RouteManagerSlideOver
          isOpen={!!selectedRouteUnit}
          onClose={(): void => setSelectedRouteUnit(null)}
          unit={selectedRouteUnit}
          onActionComplete={(): void => {
            window.location.reload();
          }}
        />
      )}

      <div className="glass-card-pro bg-white" style={{ padding: '30px' }}>
        <table className="archon-registry-table w-full">
          <thead>
            <tr>
              <th className="py-4 opacity-40">ACTIVO</th>
              <th
                onClick={(): void => handleSort('unidad')}
                className="cursor-pointer hover:bg-[#0f2a44]/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  UNIDAD
                  <SortIndicator
                    active={sortConfig.field === 'unidad'}
                    direction={sortConfig.direction}
                  />
                </div>
              </th>
              <th className="opacity-40">IDENTIDAD</th>
              <th className="opacity-40">ESTRATEGIA</th>
              <th className="opacity-40">TÉCNICO</th>
              <th
                onClick={(): void => handleSort('programacion')}
                className="cursor-pointer hover:bg-[#0f2a44]/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  PROGRAMACIÓN
                  <SortIndicator
                    active={sortConfig.field === 'programacion'}
                    direction={sortConfig.direction}
                  />
                </div>
              </th>
              <th
                onClick={(): void => handleSort('pronostico')}
                className="cursor-pointer hover:bg-[#0f2a44]/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  PRONÓSTICO
                  <SortIndicator
                    active={sortConfig.field === 'pronostico'}
                    direction={sortConfig.direction}
                  />
                </div>
              </th>
              <th className="opacity-40">SALUD</th>
              <th
                onClick={(): void => handleSort('acciones')}
                className="cursor-pointer hover:bg-[#0f2a44]/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  ACCIONES
                  <SortIndicator
                    active={sortConfig.field === 'acciones'}
                    direction={sortConfig.direction}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedUnits.map(
              (item): React.ReactElement => (
                <FleetRegistryRow
                  key={item.uuid}
                  unit={item}
                  onSelectImage={(u): void => setSelectedGalleryUnit(u)}
                  onManageRoute={(u): void => setSelectedRouteUnit(u)}
                />
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FleetGridView;
