/* eslint-disable */
import React, { useState, useCallback } from 'react';
import {
  CalendarDays,
  Gauge,
  Zap,
  ShieldAlert,
  TrendingUp,
  Tag,
  MapPin,
  Truck,
  Wrench,
  Fuel,
  ShieldCheck,
  RefreshCcw,
  Pencil,
} from 'lucide-react';
import { FleetUnit } from '../../types/fleet';
import ArchonGalleryOverlay from './ArchonGalleryOverlay';
import FleetKpiMatrix from './FleetKpiMatrix';
import {
  calculateMaintForecast,
  formatDate,
  MaintenanceForecast,
} from '../../utils/fleetPredictiveEngine';
import { formatDateTime } from '../../utils/dateUtils';
import { checkHoyNoCircula } from '../../utils/fleetCompliance';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';
import { useFleet } from '../../context/FleetContext';

// 🔱 Archon Encyclopedia Engine: v.45.7.0
// Visual Impact Update: 100% Data Parity with Master Source

interface FleetGridViewProps {
  units: FleetUnit[];
  loading?: boolean;
  onEdit: (unit: FleetUnit) => void;
}

const IdentityCluster = ({
  unit,
  tarjeta,
}: {
  unit: FleetUnit;
  tarjeta: string | number;
}): React.JSX.Element => {
  const restriction = checkHoyNoCircula(unit.environmentalHologram || null, unit.placas || null);

  return (
    <div className="flex flex-col items-center gap-2.5">
      <span className="text-[10px] font-black text-navy-400 uppercase tracking-[0.2em]">
        {unit.owner || 'ARIAN SILVER DE MÉXICO'}
      </span>
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
          <Tag size={11} className="text-slate-400" />
          <span className="text-[12px] font-black text-navy-800 uppercase tracking-tight">
            {unit.placas}
          </span>
          {restriction.isRestricted && (
            <div
              title={restriction.reason}
              className="ml-1 bg-rose-500 text-white p-0.5 rounded-[4px] animate-pulse cursor-help"
            >
              <ShieldAlert size={10} />
            </div>
          )}
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black text-navy-900/30 uppercase tracking-tighter leading-none">T. CIRCULACIÓN:</span>
          <span className="text-[10px] font-mono text-slate-400 font-bold">
            {tarjeta || '---'}
          </span>
        </div>
      </div>
      {restriction.isRestricted && (
        <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase tracking-tighter">
          {restriction.reason}
        </span>
      )}
      <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50/50 px-2.5 py-1 rounded-[4px] uppercase tracking-widest border border-emerald-100/50">
        <ShieldCheck size={12} /> {unit.complianceStatus || 'OPERATIVO'}
      </span>
      <span className="flex items-center gap-1.5 text-[10px] font-black text-navy-800 bg-sky-50 px-2.5 py-1 rounded-[4px] border border-sky-100 uppercase tracking-widest shadow-sm">
        <MapPin size={11} className="text-sky-500" /> {unit.sede || 'MINA'}
      </span>
    </div>
  );
};

const LogisticsCluster = ({
  unit,
  cuenta,
  usageUnit,
}: {
  unit: FleetUnit;
  cuenta: string | number;
  usageUnit: string;
}): React.JSX.Element => (
  <div className="flex flex-col items-center space-y-3">
    <div className="flex flex-col items-center">
      <span className="text-[10px] font-black text-navy-400 uppercase tracking-wider">LEASING</span>
      <span className="text-[14px] font-black text-navy-900">
        ${(unit.monthlyLeasePayment || 0).toLocaleString()}
      </span>
      <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 rounded uppercase tracking-tighter mt-1">
        CTA: {cuenta}
      </span>
    </div>
    <div className="flex flex-col items-center gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-black text-navy-800 uppercase tracking-tighter">
        <RefreshCcw size={11} className="text-sky-500" />
        {unit.usageFreqLabel || `${(unit.maintIntervalKm || 10000).toLocaleString()} ${usageUnit}`}
      </span>
      <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
        <CalendarDays size={11} className="text-slate-300" />
        {unit.timeFreqLabel || `${unit.maintIntervalDays || 180} DÍAS`}
      </span>
    </div>
    <div className="bg-sky-50 px-2 py-1 rounded border border-sky-100 shadow-sm">
      <span className="text-[10px] font-black text-sky-700">
        {unit.dailyUsageAvg || 0} {usageUnit}/D
      </span>
    </div>
  </div>
);

const OdometerCluster = ({
  unit,
  usageUnit,
  carga,
  tanque,
}: {
  unit: FleetUnit;
  usageUnit: string;
  carga: string | number;
  tanque: string | number;
}): React.JSX.Element => (
  <div className="flex flex-col items-center space-y-4">
    <div className="flex items-center gap-3 bg-sky-50 px-4 py-2 rounded border border-sky-100 shadow-md transform hover:scale-105 transition-transform">
      <Gauge size={16} className="text-sky-600" />
      <span className="text-[18px] font-black text-navy-900 tracking-tight">
        {(unit.odometer || 0).toLocaleString()}
      </span>
    </div>
    <div className="flex flex-col items-center opacity-60 text-[11px] font-bold text-slate-600">
      <span>
        {(unit.lastServiceReading || 0).toLocaleString()} {usageUnit}
      </span>
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
        {formatDateTime(new Date(unit.lastServiceDate || Date.now()))}
      </span>
    </div>
    <div className="flex flex-col items-center bg-amber-50 px-3 py-1 rounded border border-amber-100 shadow-sm">
      <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">
        OBJETIVO {usageUnit}
      </span>
      <span className="text-[13px] font-black text-amber-800">
        {(unit.nextServiceReading || 0).toLocaleString()}
      </span>
    </div>
    <div className="flex items-center gap-4 pt-2 border-t border-slate-100 w-full justify-center">
      <div className="flex flex-col items-center">
        <span className="text-[8px] font-black text-slate-400 uppercase">Carga</span>
        <span className="text-[10px] font-black text-navy-800">{carga} KG</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[8px] font-black text-slate-400 uppercase">Tanque</span>
        <span className="text-[10px] font-black text-navy-800">{tanque} L</span>
      </div>
    </div>
  </div>
);

const HologramBadge = ({ hologram }: { hologram: string | null }): React.JSX.Element | null => {
  if (!hologram) return null;

  const styles: Record<string, string> = {
    '00': 'bg-navy-900 text-yellow-400 border-yellow-500/50 shadow-sm',
    '0': 'bg-emerald-600 text-white border-emerald-700',
    '1': 'bg-amber-500 text-white border-amber-600',
    '2': 'bg-rose-600 text-white border-rose-700',
    Exento: 'bg-sky-500 text-white border-sky-600',
    Foráneo: 'bg-slate-500 text-white border-slate-600',
  };

  const style = styles[hologram] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[8px] font-black uppercase border ${style} tracking-tighter leading-none`}
    >
      H-{hologram}
    </div>
  );
};

const SpecCluster = ({ unit }: { unit: FleetUnit }): React.JSX.Element => {
  const fuelType = unit.fuelType || 'S/D';
  const motor = unit.motor || 'S/D';
  const poliza = unit.insurancePolicyNumber || '---';
  const verifDate = unit.lastEnvironmentalVerification
    ? new Date(unit.lastEnvironmentalVerification)
    : null;
  const mechDate = unit.lastMechanicalVerification
    ? new Date(unit.lastMechanicalVerification)
    : null;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="grid grid-cols-2 gap-1.5 w-full">
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded border justify-center shadow-sm ${
            fuelType.toLowerCase().includes('diesel')
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
              : 'bg-amber-50 border-amber-100 text-amber-800'
          }`}
        >
          <Fuel size={11} />{' '}
          <span className="text-[10px] font-black uppercase tracking-tighter">{fuelType}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-navy-50 rounded border border-navy-100 justify-center shadow-sm">
          <span className="text-[10px] font-black text-navy-800 uppercase tracking-tighter">
            {motor}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase">
        <Truck size={12} className="text-slate-300" /> {unit.tireSpec || 'S/D'} /{' '}
        <span className="text-navy-600 font-black">{unit.tireBrand || '---'}</span>
      </div>
      <div className="flex flex-col gap-1.5 w-full border-t border-gray-100 pt-2 mt-1">
        <div className="flex items-center justify-between text-[9px] font-black uppercase">
          <span className="text-rose-500">Seguro</span>
          <span className="text-navy-800 text-[10px]">
            {unit.insuranceExpiryDate ? formatDate(new Date(unit.insuranceExpiryDate)) : '---'}
          </span>
        </div>
        <div className="flex flex-col items-end -mt-1">
          <span className="text-[8px] font-black text-navy-900/30 uppercase tracking-tighter leading-none">PÓLIZA:</span>
          <span className="text-[9px] font-mono text-slate-400">
            {poliza || '---'}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1 text-[9px] font-black uppercase">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600">VERIFICACIÓN</span>
            <HologramBadge hologram={unit.environmentalHologram || null} />
          </div>
          <span className="text-navy-800 text-[10px]">
            {verifDate ? formatDate(verifDate) : '---'}
          </span>
        </div>
        <div className="flex items-center justify-between text-[9px] font-black uppercase">
          <span className="text-sky-600">MECÁNICA</span>
          <span className="text-navy-800 text-[10px]">
            {mechDate ? formatDate(mechDate) : '---'}
          </span>
        </div>
      </div>
    </div>
  );
};

const ServiceForecastCluster = ({
  forecast,
  usageUnit,
}: {
  forecast: MaintenanceForecast | null;
  usageUnit: string;
}): React.JSX.Element => {
  const kmPara = forecast?.kmParaServicio || 0;
  const isClose = kmPara < 1000;
  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex items-center gap-2">
        <Zap size={14} className={isClose ? 'text-red-500' : 'text-emerald-500'} />
        <span className={`text-[14px] font-black ${isClose ? 'text-red-600' : 'text-emerald-700'}`}>
          {kmPara.toLocaleString()} {usageUnit}
        </span>
      </div>
      <div className="bg-slate-50 px-2.5 py-1 rounded opacity-60 text-[9px] font-black uppercase text-slate-500 border border-slate-100">
        BY KM: {forecast ? formatDate(forecast.serviceByKmDate) : '--/--/--'}
      </div>
      <div className="bg-sky-50 px-2.5 py-1 rounded border border-sky-100/50 text-[9px] font-black uppercase text-sky-800 shadow-sm">
        BY FECHA: {forecast ? formatDate(forecast.serviceByTimeDate) : '--/--/--'}
      </div>
    </div>
  );
};

const HealthStatusCluster = ({
  forecast,
}: {
  forecast: MaintenanceForecast | null;
}): React.JSX.Element => {
  const isOverdue = !!forecast?.isOverdue;
  return (
    <div
      className={`flex flex-col items-center p-3.5 rounded-[4px] shadow-md transition-all duration-500 min-w-[110px] ${
        isOverdue
          ? 'bg-red-500 scale-105 shadow-red-200'
          : 'bg-emerald-50 border border-emerald-100'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {isOverdue ? (
          <ShieldAlert size={14} className="text-white" />
        ) : (
          <TrendingUp size={13} className="text-emerald-600" />
        )}
        <span
          className={`text-[10px] font-black uppercase tracking-[0.15em] ${
            isOverdue ? 'text-white' : 'text-emerald-700 opacity-60'
          }`}
        >
          {isOverdue ? 'VENCIDO' : 'PRONÓSTICO'}
        </span>
      </div>
      <span
        className={`text-[16px] font-black tracking-tighter ${
          isOverdue ? 'text-white' : 'text-navy-900'
        }`}
      >
        {forecast ? formatDate(forecast.forecastDate) : '---'}
      </span>
    </div>
  );
};

// ============================================================================
// ARCHON INTERNAL HELPERS (DRY & SRP)
// ============================================================================
const getUnitForecast = (unit: FleetUnit): MaintenanceForecast | null =>
  calculateMaintForecast(
    unit.maintIntervalDays,
    unit.maintIntervalKm,
    unit.dailyUsageAvg || 0,
    unit.odometer,
    unit.lastServiceReading || 0,
    unit.lastServiceDate || null
  );

// ============================================================================
// COMPONENT: FleetUnitRow (SOLID: SRP + Performance Optimization)
// ============================================================================
const FleetUnitRow = React.memo(({
  unit,
  onSelectImage,
  onEdit,
}: {
  unit: FleetUnit;
  onSelectImage: (u: FleetUnit) => void;
  onEdit: (u: FleetUnit) => void;
}): React.JSX.Element => {
  const forecast = getUnitForecast(unit);
  const isOverdue = !!forecast?.isOverdue;

  const usageUnit =
    unit.assetType?.toLowerCase().includes('veh') || unit.assetType === 'Vehiculo' ? 'KM' : 'HRS';

  return (
    <tr
      data-testid={`fleet-row-${unit.id.toLowerCase()}`}
      className={`transition-all duration-300 hover:bg-[#0f2a44]/[0.025] ${
        isOverdue ? 'bg-red-50/40' : ''
      }`}
    >
      <td className="py-16 text-center">
        {unit.images?.[0] ? (
          <img
            src={unit.images[0]}
            className="w-48 h-48 rounded-[4px] shadow-sm object-cover cursor-pointer hover:scale-105 transition-transform"
            onClick={(): void => onSelectImage(unit)}
            alt={unit.id}
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
              const imgElement = e.currentTarget;
              imgElement.src = '/img/archon-unit-placeholder.png';
            }}
          />
        ) : (
          <div 
            className="w-48 h-48 rounded-[4px] bg-gray-50 flex items-center justify-center border border-dashed border-gray-200 cursor-pointer overflow-hidden relative"
            onClick={(): void => onSelectImage(unit)}
          >
            <img 
              src="/img/archon-unit-placeholder.png" 
              alt="Archon Unit Placeholder" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </td>

      <td className="text-center px-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[13px] font-black text-yellow-500 bg-navy-900 px-3 py-1 rounded shadow-lg tracking-[0.2em]">
            {unit.id}
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-black text-navy-900 uppercase tracking-tight">
              {unit.marca} {unit.modelo}
            </span>
            <span className="text-[11px] font-bold text-slate-500 mt-0.5">
              ({unit.year || 'SIN REGISTRO'}) • {unit.color || 'SIN REGISTRO'}
            </span>
          </div>
          <div className="flex flex-col items-center opacity-80 pt-1">
            <span className="text-[10px] font-black text-navy-400 uppercase tracking-widest flex items-center gap-1.5">
              <Wrench size={12} />
              {unit.departamento || 'SIN REGISTRO'}
            </span>
            <span className="text-[9px] font-mono text-slate-400 mt-1">VIN: {unit.numeroSerie || '---'}</span>
          </div>
        </div>
      </td>

      <td className="text-center px-6">
        <IdentityCluster unit={unit} tarjeta={unit.circulationCardNumber || '---'} />
      </td>

      <td className="text-center px-6 border-x border-slate-50/50">
        <LogisticsCluster unit={unit} cuenta={unit.accountingAccount || '---'} usageUnit={usageUnit} />
      </td>

      <td className="py-12 px-2 min-w-[140px]">
        <OdometerCluster
          unit={unit}
          usageUnit={usageUnit}
          carga={unit.capacidadCarga || 0}
          tanque={unit.fuelTankCapacity || 0}
        />
      </td>

      <td className="py-12 px-2 min-w-[180px]">
        <SpecCluster unit={unit} />
      </td>

      <td className="text-center px-6">
        <ServiceForecastCluster forecast={forecast} usageUnit={usageUnit} />
      </td>

      <td className="text-center px-6">
        <HealthStatusCluster forecast={forecast} />
      </td>

      <td className="text-center px-6">
        <FleetKpiMatrix
          availability={unit.availabilityIndex ?? 100}
          mtbf={unit.mtbfHours ?? 0}
          mttr={unit.mttrHours ?? 0}
          backlog={unit.backlogCount ?? 0}
          healthScore={isOverdue ? 0 : unit.healthScore ?? 100}
          daysRemaining={
            forecast
              ? Math.ceil((forecast.forecastDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : undefined
          }
        />
      </td>

      <td className="text-center px-6">
        <div className="flex gap-2 justify-center">
          <button
            onClick={(): void => onEdit(unit)}
            title="Editar Activo (Auditado)"
            className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all duration-300 rounded-[4px] hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm group border-none outline-none"
          >
            <Pencil size={18} className="transition-transform duration-300 group-hover:rotate-12" />
          </button>
        </div>
      </td>
    </tr>
  );
});

// ============================================================================
// MAIN COMPONENT: FleetGridView
// ============================================================================
export const FleetGridView = ({
  units = [],
  loading = false,
  onEdit,
}: FleetGridViewProps): React.JSX.Element => {
  const { getUnitDetails } = useFleet();
  const [selectedGalleryUnit, setSelectedGalleryUnit] = useState<FleetUnit | null>(null);
  const [isFetchingImages, setIsFetchingImages] = useState(false);

  // 🛡️ Data Integrity Sentinel: Filter out invalid records to prevent render crashes
  const sanitizedUnits = React.useMemo(() => {
    return (units || []).filter(u => u && u.id);
  }, [units]);

  const handleSelectImage = useCallback(async (unit: FleetUnit): Promise<void> => {
    // 🔱 Atomic Hydration Trigger
    if (!unit.images || unit.images.length === 0) {
      setIsFetchingImages(true);
      const fullUnit = await getUnitDetails(unit.id);
      setIsFetchingImages(false);
      if (fullUnit) {
        setSelectedGalleryUnit(fullUnit);
      } else {
        setSelectedGalleryUnit(unit); // Fallback to original
      }
    } else {
      setSelectedGalleryUnit(unit);
    }
  }, [getUnitDetails]);

  const [sortConfig, setSortConfig] = useState<{
    field: 'unidad' | 'programacion' | 'pronostico' | null;
    direction: 'asc' | 'desc';
  }>({ field: null, direction: 'asc' });

  const sortedUnits = React.useMemo((): FleetUnit[] => {
    if (!sortConfig.field) return sanitizedUnits;

    const unitsWithForecast = sanitizedUnits.map(
      (u: FleetUnit): { unit: FleetUnit; forecast: MaintenanceForecast | null } => ({
        unit: u,
        forecast: getUnitForecast(u),
      })
    );

    return [...unitsWithForecast]
      .sort(
        (
          a: { unit: FleetUnit; forecast: MaintenanceForecast | null },
          b: { unit: FleetUnit; forecast: MaintenanceForecast | null }
        ): number => {
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
        }
      )
      .map((i: { unit: FleetUnit; forecast: MaintenanceForecast | null }): FleetUnit => i.unit);
  }, [sanitizedUnits, sortConfig]);

  const headers: ArchonTableHeader[] = [
    { key: 'activo', label: 'ACTIVO' },
    { key: 'unidad', label: 'UNIDAD / MODELO', sortable: true },
    { key: 'identidad', label: 'IDENTIDAD' },
    { key: 'logistica', label: 'LOGÍSTICA' },
    { key: 'odometria', label: 'ODOMETRÍA' },
    { key: 'configuracion', label: 'CONFIGURACIÓN' },
    { key: 'programacion', label: 'KM RESTANTES', sortable: true },
    { key: 'pronostico', label: 'PRONÓSTICO (FECHA)', sortable: true },
    { key: 'salud', label: 'SALUD' },
    { key: 'acciones', label: 'ACCIONES' },
  ];

  return (
    <div className="animate-in fade-in duration-700 space-y-[20px] text-[#0f2a44]">
      {selectedGalleryUnit && (
        <ArchonGalleryOverlay
          images={selectedGalleryUnit.images || []}
          assetId={selectedGalleryUnit.id}
          onClose={(): void => setSelectedGalleryUnit(null)}
        />
      )}
      <ArchonDataTable
        testId="fleet-inventory-table"
        loading={loading}
        loadingMessage="Sincronizando Activos..."
        data={sortedUnits}
        headers={headers}
        onSort={(key): void => {
          const field = key as 'unidad' | 'programacion' | 'pronostico';
          setSortConfig((p) => ({
            field,
            direction: p.field === field && p.direction === 'asc' ? 'desc' : 'asc',
          }));
        }}
        sortConfig={sortConfig}
        renderRow={(unit): React.ReactElement => (
          <FleetUnitRow
            key={unit.id}
            unit={unit}
            onSelectImage={handleSelectImage}
            onEdit={onEdit}
          />
        )}
      />
      {isFetchingImages && (
        <div className="fixed bottom-10 right-10 bg-navy-900 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce z-[100] flex items-center gap-3">
          <RefreshCcw size={20} className="animate-spin text-yellow-400" />
          <span className="text-xs font-black uppercase tracking-widest">Hidratando Activos...</span>
        </div>
      )}
    </div>
  );
};

export default FleetGridView;
