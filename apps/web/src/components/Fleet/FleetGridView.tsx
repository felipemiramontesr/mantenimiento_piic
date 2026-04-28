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
  Truck,
  Wrench,
} from 'lucide-react';
import { FleetUnit } from '../../types/fleet';
import ArchonGalleryOverlay from './ArchonGalleryOverlay';
import FleetKpiMatrix from './FleetKpiMatrix';
import {
  calculateMaintForecast,
  formatDate,
  MaintenanceForecast,
} from '../../utils/fleetPredictiveEngine';
import { ArchonTableSkeleton } from '../ArchonSkeleton';

interface FleetGridViewProps {
  units: FleetUnit[];
  loading?: boolean;
}

const AssetUnitCluster = ({ unit }: { unit: FleetUnit }): React.JSX.Element => (
  <div className="flex flex-col items-center gap-1.5">
    <span className="text-[11px] font-black text-[#f2b705] bg-[#0f2a44] px-2 py-0.5 rounded-[4px] tracking-tighter">
      {unit.id}
    </span>
    <div className="flex flex-col items-center -space-y-0.5">
      <span className="text-[11px] font-black text-[#0f2a44] uppercase tracking-tight">
        {unit.marca}
      </span>
      <span className="text-[10px] font-bold text-[#0f2a44] opacity-50 uppercase tracking-tight">
        {unit.modelo}
      </span>
    </div>
    <span className="text-[9px] font-black text-[#0f2a44] uppercase tracking-widest opacity-80">
      {unit.departamento}
    </span>
  </div>
);

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
  const intervalKm = unit.usageLimitUnits || unit.maintIntervalKm || 10000;
  const intervalDays = unit.timeLimitDays || unit.maintIntervalDays || 180;
  const avgDaily = unit.dailyUsageAvg || 0;
  const lease = unit.monthlyLeasePayment || 0;

  // 🔱 Dynamic Asset Type Mapping
  const isMaquinaria = unit.assetTypeId === 2 || unit.assetType === 'Maquinaria';
  const StrategyIcon = isMaquinaria ? Wrench : Truck;
  const strategyLabel = isMaquinaria ? 'Maquinaria' : 'Vehículo';

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* 🔱 Asset Type & Lease */}
      <div className="flex flex-col items-center mb-1">
        <StrategyIcon size={14} className="text-[#0f2a44] opacity-80" />
        <span className="text-[8px] font-black uppercase tracking-[0.1em] text-[#0f2a44] opacity-40">
          {strategyLabel}
        </span>
        {lease > 0 && (
          <div className="mt-1 px-1.5 py-0.5 bg-gray-50 rounded-[3px] border border-gray-100">
            <span className="text-[8px] font-black text-gray-500">
              ${lease.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-1.5 opacity-60">
          <RefreshCcw size={10} className="text-[#0f2a44]" />
          <span className="text-[9px] font-black text-[#0f2a44]">
            {unit.usageFreqLabel || `${intervalKm.toLocaleString()} KM`}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-1.5 opacity-40">
          <CalendarDays size={10} />
          <span className="text-[9px] font-bold">
            {unit.timeFreqLabel || `${intervalDays} DÍAS`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-sky-50 px-1.5 py-0.5 rounded-[4px]">
        <Activity size={9} className="text-sky-600" />
        <span className="text-[9px] font-black text-sky-700">{avgDaily} KM/D</span>
      </div>
    </div>
  );
};

const OdometryCluster = ({ unit }: { unit: FleetUnit }): React.JSX.Element => {
  const odometer = Number(unit.odometer) || 0;
  const lastReading = Number(unit.lastServiceReading) || 0;
  const intervalKm = Number(unit.usageLimitUnits || unit.maintIntervalKm || 10000);
  const targetKm = lastReading + intervalKm;

  let serviceDateStr = '---';
  if (unit.lastServiceDate) {
    serviceDateStr = formatDate(new Date(unit.lastServiceDate));
  }
  return (
    <div className="flex flex-col items-center space-y-3">
      {/* Actual */}
      <div className="flex items-center gap-2 bg-sky-50 px-3 py-1 rounded-[4px] border border-sky-100/50 shadow-sm">
        <Gauge size={13} className="text-sky-600" />
        <span className="text-[13px] font-black text-sky-800 tracking-tight">
          {odometer.toLocaleString()}
        </span>
      </div>

      {/* Anterior */}
      <div className="flex flex-col items-center opacity-40 group hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          <History size={10} className="text-slate-500" />
          <span className="text-[10px] font-bold text-slate-600">
            {lastReading.toLocaleString()} KM
          </span>
        </div>
        <span className="text-[8px] font-black uppercase text-center tracking-wider text-slate-500">
          {serviceDateStr}
        </span>
      </div>

      {/* Próximo KM (Target) */}
      <div className="flex flex-col items-center bg-amber-50 px-2 py-0.5 rounded-[4px] border border-amber-100">
        <span className="text-[7px] font-black text-amber-600 uppercase tracking-tighter">
          OBJETIVO KM
        </span>
        <span className="text-[10px] font-black text-amber-800 tracking-tighter">
          {targetKm.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

const SpecCluster = ({ unit }: { unit: FleetUnit }): React.JSX.Element => {
  const insuranceDate = unit.insuranceExpiryDate || unit.vigenciaSeguro;
  const verificationDate = unit.vencimientoVerificacion;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Energía & Rodado */}
      <div className="grid grid-cols-2 gap-1 w-full">
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-50 rounded-[3px] border border-yellow-100/50 justify-center">
          <Zap size={9} className="text-yellow-600" />
          <span className="text-[8px] font-black text-yellow-800 uppercase tracking-tighter">
            {unit.fuelType || 'GAS'}
          </span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 rounded-[3px] border border-slate-100 justify-center">
          <Truck size={9} className="text-slate-600" />
          <span className="text-[8px] font-bold text-slate-700 uppercase tracking-tighter">
            {unit.tireSpec}
          </span>
        </div>
      </div>

      {/* Cumplimiento Legal (Fechas) */}
      <div className="flex flex-col gap-1 w-full border-t border-gray-100 pt-2 mt-1">
        <div className="flex items-center justify-between px-2 py-0.5 bg-rose-50/50 rounded-[4px]">
          <span className="text-[7px] font-black text-rose-800 uppercase">Seguro:</span>
          <span className="text-[8px] font-bold text-rose-900">
            {insuranceDate ? formatDate(new Date(insuranceDate)) : 'PENDIENTE'}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-0.5 bg-emerald-50/50 rounded-[4px]">
          <span className="text-[7px] font-black text-emerald-800 uppercase">Verif:</span>
          <span className="text-[8px] font-bold text-emerald-900">
            {verificationDate ? formatDate(new Date(verificationDate)) : 'PENDIENTE'}
          </span>
        </div>
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
}: {
  unit: FleetUnit;
  onSelectImage: (u: FleetUnit) => void;
}): React.JSX.Element => {
  const forecast = calculateMaintForecast(
    unit.timeLimitDays || unit.maintIntervalDays || 180,
    unit.usageLimitUnits || unit.maintIntervalKm || 10000,
    unit.dailyUsageAvg || 0,
    unit.odometer,
    unit.lastServiceReading || 0,
    unit.lastServiceDate || null
  );
  const isOverdue = !!forecast?.isOverdue;
  let rowClass = 'transition-all duration-300 hover:bg-[#0f2a44]/[0.015]';
  if (isOverdue) {
    rowClass = `${rowClass} bg-red-50/30`;
  }

  let zapClass = 'text-emerald-500';
  let kmTextClass = 'text-emerald-700';
  if (forecast && forecast.kmParaServicio < 1000) {
    zapClass = 'text-red-500';
    kmTextClass = 'text-red-600';
  }

  const hasImages = Array.isArray(unit.images) && unit.images.length > 0;

  return (
    <tr className={rowClass}>
      <td className="py-6 text-center">
        <div className="flex justify-center items-center">
          {hasImages ? (
            <img
              src={unit.images![0]}
              className="w-48 h-48 rounded-[4px] object-cover cursor-pointer"
              alt={unit.id}
              onClick={(): void => onSelectImage(unit)}
            />
          ) : (
            <div className="w-48 h-48 rounded-[4px] bg-gray-50 flex items-center justify-center text-gray-300">
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
      <td className="py-6 min-w-[120px]">
        <OdometryCluster unit={unit} />
      </td>
      <td className="py-6 min-w-[180px]">
        <SpecCluster unit={unit} />
      </td>
      <td className="text-center px-4">
        <div className="flex flex-col items-center space-y-2">
          {/* KM Forecast */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <Zap size={10} className={zapClass} />
              <span className={`text-[10px] font-black ${kmTextClass}`}>
                {forecast ? forecast.kmParaServicio.toLocaleString() : '---'} KM
              </span>
            </div>
            <div className="flex items-center opacity-40 bg-gray-50 px-2 py-0.5 rounded-[4px]">
              <span className="text-[8px] font-black uppercase tracking-tighter">
                KM: {forecast ? formatDate(forecast.serviceByKmDate) : '---'}
              </span>
            </div>
          </div>
          {/* Time Forecast */}
          <div className="flex items-center opacity-70 bg-sky-50 px-2 py-0.5 rounded-[4px] border border-sky-100/50">
            <CalendarDays size={9} className="text-sky-600 mr-1" />
            <span className="text-[8.5px] font-black text-sky-800 uppercase tracking-tighter">
              FECHA: {forecast ? formatDate(forecast.serviceByTimeDate) : '---'}
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
            healthScore={unit.healthScore}
          />
        </div>
      </td>
    </tr>
  );
};

export const FleetGridView = ({
  units = [],
  loading = false,
}: FleetGridViewProps): React.JSX.Element => {
  const [selectedGalleryUnit, setSelectedGalleryUnit] = React.useState<FleetUnit | null>(null);
  const [sortConfig, setSortConfig] = React.useState<{
    field: 'unidad' | 'programacion' | 'pronostico' | null;
    direction: 'asc' | 'desc';
  }>({ field: null, direction: 'asc' });

  const sortedUnits = React.useMemo((): FleetUnit[] => {
    if (!sortConfig.field) return units;
    const unitsMap = units.map((u) => ({
      unit: u,
      forecast: calculateMaintForecast(
        u.timeLimitDays || u.maintIntervalDays || 180,
        u.usageLimitUnits || u.maintIntervalKm || 10000,
        u.dailyUsageAvg || 0,
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
        }
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      })
      .map((item) => item.unit);
  }, [units, sortConfig]);

  const handleSort = (field: 'unidad' | 'programacion' | 'pronostico'): void => {
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

  if (loading) {
    return (
      <div className="glass-card-pro bg-white p-6 space-y-6">
        <div className="flex items-center gap-3 opacity-40 animate-pulse">
          <div className="w-4 h-4 bg-[#f2b705] rounded-full" />
          <span className="text-[11px] font-black text-[#0f2a44] uppercase tracking-[0.2em]">
            Sincronizando Activos...
          </span>
        </div>
        <ArchonTableSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700 space-y-[20px] text-[#0f2a44]">
      {selectedGalleryUnit && (
        <ArchonGalleryOverlay
          images={selectedGalleryUnit.images || []}
          assetId={selectedGalleryUnit.id}
          onClose={(): void => setSelectedGalleryUnit(null)}
        />
      )}
      {selectedGalleryUnit && (
        <ArchonGalleryOverlay
          images={selectedGalleryUnit.images || []}
          assetId={selectedGalleryUnit.id}
          onClose={(): void => setSelectedGalleryUnit(null)}
        />
      )}

      <div className="glass-card-pro bg-white p-6">
        <table className="archon-registry-table w-full">
          <thead>
            <tr>
              <th className="py-4 opacity-40">ACTIVO</th>
              <th
                onClick={(): void => handleSort('unidad')}
                className="cursor-pointer hover:bg-[#0f2a44]/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  UNIDAD / MODELO
                  <SortIndicator
                    active={sortConfig.field === 'unidad'}
                    direction={sortConfig.direction}
                  />
                </div>
              </th>
              <th className="opacity-40">IDENTIDAD / SEDE</th>
              <th className="opacity-40">FRECUENCIAS / TARIFA</th>
              <th className="opacity-40">ODOMETRÍA (ACTUAL/ANT/OBJ)</th>
              <th className="opacity-40">CONFIG / LEGAL</th>
              <th
                onClick={(): void => handleSort('programacion')}
                className="cursor-pointer hover:bg-[#0f2a44]/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center gap-1 text-amber-600">
                  KM RESTANTES
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
                  PRONÓSTICO (FECHA)
                  <SortIndicator
                    active={sortConfig.field === 'pronostico'}
                    direction={sortConfig.direction}
                  />
                </div>
              </th>
              <th className="opacity-40">SALUD</th>
            </tr>
          </thead>
          <tbody>
            {sortedUnits.map(
              (item): React.ReactElement => (
                <FleetRegistryRow
                  key={item.uuid}
                  unit={item}
                  onSelectImage={(u): void => setSelectedGalleryUnit(u)}
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
