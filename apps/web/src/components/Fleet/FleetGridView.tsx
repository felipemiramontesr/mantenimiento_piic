import React, { useState } from 'react';
import {
  Image as ImageIcon,
  CalendarDays,
  Gauge,
  Zap,
  ShieldAlert,
  TrendingUp,
  Tag,
  MapPin,
  ChevronUp,
  ChevronDown,
  Truck,
  Wrench,
  Fuel,
  ShieldCheck,
  RefreshCcw,
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

// 🔱 Archon Encyclopedia Engine: v.45.7.0
// Visual Impact Update: 100% Data Parity with Master Source

interface FleetGridViewProps {
  units: FleetUnit[];
  loading?: boolean;
}

const IdentityCluster = ({
  unit,
  tarjeta,
}: {
  unit: FleetUnit;
  tarjeta: string | number;
}): React.JSX.Element => (
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
      </div>
      <span className="text-[10px] font-mono text-slate-400 uppercase">TC: {tarjeta}</span>
    </div>
    <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50/50 px-2.5 py-1 rounded-full uppercase tracking-widest border border-emerald-100/50">
      <ShieldCheck size={12} /> {unit.complianceStatus || 'OPERATIVO'}
    </span>
    <span className="flex items-center gap-1.5 text-[10px] font-black text-navy-800 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100 uppercase tracking-widest shadow-sm">
      <MapPin size={11} className="text-sky-500" /> {unit.sede || 'MINA'}
    </span>
  </div>
);

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
        {formatDate(new Date(unit.lastServiceDate || Date.now()))}
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
        <Truck size={12} className="text-slate-300" /> {unit.tireSpec || '255/70 R16'} /{' '}
        <span className="text-navy-600 font-black">{unit.tireBrand || '---'}</span>
      </div>
      <div className="flex flex-col gap-1.5 w-full border-t border-gray-100 pt-2 mt-1">
        <div className="flex items-center justify-between text-[9px] font-black uppercase">
          <span className="text-rose-500">Seguro</span>
          <span className="text-navy-800 text-[10px]">
            {unit.insuranceExpiryDate ? formatDate(new Date(unit.insuranceExpiryDate)) : '---'}
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-400 text-right -mt-1 uppercase tracking-tighter">
          POL: {poliza}
        </span>
        <div className="flex items-center justify-between mt-1 text-[9px] font-black uppercase">
          <span className="text-emerald-600">Verif</span>
          <span className="text-navy-800 text-[10px]">{formatDate(verifDate)}</span>
        </div>
        <div className="flex items-center justify-between text-[9px] font-black uppercase">
          <span className="text-sky-600">Mecánica</span>
          <span className="text-navy-800 text-[10px]">{formatDate(mechDate)}</span>
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
      className={`flex flex-col items-center p-3.5 rounded-lg shadow-md transition-all duration-500 min-w-[110px] ${
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
// COMPONENT: FleetUnitRow (SOLID: SRP)
// ============================================================================
const FleetUnitRow = ({
  unit,
  onSelectImage,
}: {
  unit: FleetUnit;
  onSelectImage: (u: FleetUnit) => void;
}): React.JSX.Element => {
  const forecast = getUnitForecast(unit);
  const isOverdue = !!forecast?.isOverdue;

  const usageUnit =
    unit.assetType?.toLowerCase().includes('veh') || unit.assetType === 'Vehiculo' ? 'KM' : 'HRS';

  const mockData = {
    vin: unit.numeroSerie || '---',
    tarjeta: unit.circulationCardNumber || '---',
    cuenta: unit.accountingAccount || '---',
    carga: unit.capacidadCarga || 0,
    tanque: unit.fuelTankCapacity || 0,
  };

  return (
    <tr
      className={`transition-all duration-300 hover:bg-[#0f2a44]/[0.025] border-b border-slate-100 ${
        isOverdue ? 'bg-red-50/40' : ''
      }`}
    >
      <td className="py-16 text-center pl-8 pr-4">
        {unit.images?.[0] ? (
          <img
            src={unit.images[0]}
            className="w-48 h-48 rounded-lg shadow-sm object-cover cursor-pointer hover:scale-105 transition-transform"
            onClick={(): void => onSelectImage(unit)}
            alt={unit.id}
          />
        ) : (
          <div className="w-48 h-48 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 border border-dashed border-gray-200">
            <ImageIcon size={48} />
          </div>
        )}
      </td>

      <td className="text-center px-4">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[13px] font-black text-yellow-500 bg-navy-900 px-3 py-1 rounded shadow-lg tracking-[0.2em]">
            {unit.id}
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-black text-navy-900 uppercase tracking-tight">
              {unit.marca} {unit.modelo}
            </span>
            <span className="text-[11px] font-bold text-slate-500 mt-0.5">
              ({unit.year || '---'}) • {unit.color || 'S/C'}
            </span>
          </div>
          <div className="flex flex-col items-center opacity-80 pt-1">
            <span className="text-[10px] font-black text-navy-400 uppercase tracking-widest flex items-center gap-1.5">
              <Wrench size={12} />
              {unit.departamento}
            </span>
            <span className="text-[9px] font-mono text-slate-400 mt-1">VIN: {mockData.vin}</span>
          </div>
        </div>
      </td>

      <td className="text-center px-4">
        <IdentityCluster unit={unit} tarjeta={mockData.tarjeta} />
      </td>

      <td className="text-center px-4 border-x border-slate-50/50">
        <LogisticsCluster unit={unit} cuenta={mockData.cuenta} usageUnit={usageUnit} />
      </td>

      <td className="py-16 px-4 min-w-[160px]">
        <OdometerCluster
          unit={unit}
          usageUnit={usageUnit}
          carga={mockData.carga}
          tanque={mockData.tanque}
        />
      </td>

      <td className="py-16 px-4 min-w-[200px]">
        <SpecCluster unit={unit} />
      </td>

      <td className="text-center px-4">
        <ServiceForecastCluster forecast={forecast} usageUnit={usageUnit} />
      </td>

      <td className="text-center px-4">
        <HealthStatusCluster forecast={forecast} />
      </td>

      <td className="text-center pl-4 pr-8">
        <div className="flex flex-col gap-2">
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
        </div>
      </td>
    </tr>
  );
};

// ============================================================================
// MAIN COMPONENT: FleetGridView
// ============================================================================
export const FleetGridView = ({
  units = [],
  loading = false,
}: FleetGridViewProps): React.JSX.Element => {
  const [selectedGalleryUnit, setSelectedGalleryUnit] = useState<FleetUnit | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    field: 'unidad' | 'programacion' | 'pronostico' | null;
    direction: 'asc' | 'desc';
  }>({ field: null, direction: 'asc' });

  const sortedUnits = React.useMemo((): FleetUnit[] => {
    if (!sortConfig.field) return units;

    const unitsWithForecast = units.map(
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
  }, [units, sortConfig]);

  if (loading)
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

  return (
    <div className="animate-in fade-in duration-700 space-y-[20px] text-[#0f2a44]">
      {selectedGalleryUnit && (
        <ArchonGalleryOverlay
          images={selectedGalleryUnit.images || []}
          assetId={selectedGalleryUnit.id}
          onClose={(): void => setSelectedGalleryUnit(null)}
        />
      )}
      <div className="glass-card-pro bg-white pb-8 overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] shadow-2xl rounded-xl custom-scrollbar">
        <table className="archon-registry-table w-full min-w-[1500px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-[#0f2a44]">
              <th className="sticky top-0 z-50 bg-[#0f2a44] py-8 pl-8 pr-4 font-black tracking-widest text-[11px] text-white shadow-sm border-none h-24">
                <div className="flex items-center justify-center h-full">ACTIVO</div>
              </th>
              <th
                onClick={(): void =>
                  setSortConfig(
                    (p: {
                      field: 'unidad' | 'programacion' | 'pronostico' | null;
                      direction: 'asc' | 'desc';
                    }): {
                      field: 'unidad' | 'programacion' | 'pronostico' | null;
                      direction: 'asc' | 'desc';
                    } => ({
                      field: 'unidad',
                      direction: p.field === 'unidad' && p.direction === 'asc' ? 'desc' : 'asc',
                    })
                  )
                }
                className="sticky top-0 z-50 bg-[#0f2a44] cursor-pointer hover:bg-white/10 transition-colors py-8 px-4 shadow-sm text-white border-none h-24"
              >
                <div className="flex items-center justify-center gap-2 font-black text-[11px] tracking-widest h-full">
                  UNIDAD / MODELO
                  <span
                    className={`inline-flex ml-1 ${
                      sortConfig.field === 'unidad' ? 'text-amber-400' : 'opacity-40'
                    }`}
                  >
                    {sortConfig.field === 'unidad' && sortConfig.direction === 'desc' ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronUp size={16} />
                    )}
                  </span>
                </div>
              </th>
              <th className="sticky top-0 z-50 bg-[#0f2a44] py-8 px-4 font-black tracking-widest text-[11px] text-white shadow-sm border-none h-24">
                <div className="flex items-center justify-center h-full">
                  IDENTIDAD / PROPIEDAD / SEDE
                </div>
              </th>
              <th className="sticky top-0 z-50 bg-[#0f2a44] py-8 px-4 font-black tracking-widest text-[11px] text-white shadow-sm border-none h-24">
                <div className="flex items-center justify-center h-full">FRECUENCIAS / TARIFA</div>
              </th>
              <th className="sticky top-0 z-50 bg-[#0f2a44] py-8 px-4 font-black tracking-widest text-[11px] text-white shadow-sm border-none h-24">
                <div className="flex items-center justify-center h-full">
                  ODOMETRÍA (ACTUAL/ANT/OBJ)
                </div>
              </th>
              <th className="sticky top-0 z-50 bg-[#0f2a44] py-8 px-4 font-black tracking-widest text-[11px] text-white shadow-sm border-none h-24">
                <div className="flex items-center justify-center h-full">CONFIG / LEGAL</div>
              </th>
              <th
                onClick={(): void =>
                  setSortConfig(
                    (p: {
                      field: 'unidad' | 'programacion' | 'pronostico' | null;
                      direction: 'asc' | 'desc';
                    }): {
                      field: 'unidad' | 'programacion' | 'pronostico' | null;
                      direction: 'asc' | 'desc';
                    } => ({
                      field: 'programacion',
                      direction:
                        p.field === 'programacion' && p.direction === 'asc' ? 'desc' : 'asc',
                    })
                  )
                }
                className="sticky top-0 z-50 bg-[#0f2a44] cursor-pointer hover:bg-white/10 transition-colors py-8 px-4 shadow-sm text-white border-none h-24"
              >
                <div className="flex items-center justify-center gap-2 font-black text-[11px] tracking-widest h-full">
                  KM RESTANTES
                  <span
                    className={`inline-flex ml-1 ${
                      sortConfig.field === 'programacion' ? 'text-amber-400' : 'opacity-40'
                    }`}
                  >
                    {sortConfig.field === 'programacion' && sortConfig.direction === 'desc' ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronUp size={16} />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={(): void =>
                  setSortConfig(
                    (p: {
                      field: 'unidad' | 'programacion' | 'pronostico' | null;
                      direction: 'asc' | 'desc';
                    }): {
                      field: 'unidad' | 'programacion' | 'pronostico' | null;
                      direction: 'asc' | 'desc';
                    } => ({
                      field: 'pronostico',
                      direction: p.field === 'pronostico' && p.direction === 'asc' ? 'desc' : 'asc',
                    })
                  )
                }
                className="sticky top-0 z-50 bg-[#0f2a44] cursor-pointer hover:bg-white/10 transition-colors py-8 px-4 shadow-sm text-white border-none h-24"
              >
                <div className="flex items-center justify-center gap-2 font-black text-[11px] tracking-widest h-full">
                  PRONÓSTICO (FECHA)
                  <span
                    className={`inline-flex ml-1 ${
                      sortConfig.field === 'pronostico' ? 'text-amber-400' : 'opacity-40'
                    }`}
                  >
                    {sortConfig.field === 'pronostico' && sortConfig.direction === 'desc' ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronUp size={16} />
                    )}
                  </span>
                </div>
              </th>
              <th className="sticky top-0 z-50 bg-[#0f2a44] py-8 pl-4 pr-8 font-black tracking-widest text-[11px] text-white shadow-sm border-none h-24">
                <div className="flex items-center justify-center h-full">SALUD</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedUnits.map(
              (unit): React.ReactElement => (
                <FleetUnitRow key={unit.uuid} unit={unit} onSelectImage={setSelectedGalleryUnit} />
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FleetGridView;
