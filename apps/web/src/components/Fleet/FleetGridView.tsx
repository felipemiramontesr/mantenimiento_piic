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

// 🔱 Archon Encyclopedia Engine: v.45.5.4
// Complexity reduction and clean imports.

interface FleetGridViewProps {
  units: FleetUnit[];
  loading?: boolean;
}

const getMockData = (
  unitId: string,
  field: string,
  realValue: string | number | null | undefined
): string | number => {
  if (realValue != null && realValue !== '' && realValue !== 0) return realValue as string | number;
  const hash = unitId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mocks: Record<string, string | number> = {
    numeroSerie: `3VW${hash}${unitId.replace(/[^0-9]/g, '')}Z${hash % 9}X${2024 - (hash % 10)}`,
    insurancePolicyNumber: `POL-${2024 + (hash % 2)}-${hash}${hash}`,
    circulationCardNumber: `TC-${hash}-${unitId.replace(/[^0-9]/g, '')}`,
    accountingAccount: `8019-001-${100 + (hash % 900)}`,
    year: 2018 + (hash % 7),
    color: ['BLANCO', 'GRIS', 'PLATA', 'NEGRO', 'ROJO'][hash % 5],
    motor: ['L4 2.5L DOHC', 'V6 3.5L VVT-i', 'L4 2.8L Turbo Diesel', 'V8 6.4L HEMI'][hash % 4],
    capacidadCarga: [850, 1050, 1200, 1500, 3500][hash % 5],
    fuelTankCapacity: [55, 65, 80, 110, 130][hash % 5],
    tireBrand: ['MICHELIN', 'BF GOODRICH', 'BRIDGESTONE', 'PIRELLI', 'YOKOHAMA'][hash % 5],
    lastMechanicalVerification: '2024-06-20',
  };
  return mocks[field] || '--';
};

const IdentityCluster = ({
  unit,
  tarjeta,
}: {
  unit: FleetUnit;
  tarjeta: string | number;
}): React.JSX.Element => (
  <div className="flex flex-col items-center gap-2">
    <span className="text-[8px] font-black text-navy-400 uppercase tracking-[0.2em]">
      {unit.owner || 'ARIAN SILVER DE MÉXICO'}
    </span>
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
        <Tag size={9} className="text-slate-400" />
        <span className="text-[10px] font-black text-navy-800 uppercase">{unit.placas}</span>
      </div>
      <span className="text-[8px] font-mono text-slate-400 uppercase">TC: {tarjeta}</span>
    </div>
    <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50/50 px-2 py-0.5 rounded-full uppercase tracking-widest">
      <ShieldCheck size={10} /> {unit.complianceStatus || 'OPERATIVO'}
    </span>
    <span className="flex items-center gap-1 text-[9px] font-black text-navy-800 bg-sky-50 px-2 py-1 rounded-full border border-sky-100 uppercase tracking-widest">
      <MapPin size={9} className="text-sky-500" /> {unit.sede || 'MINA'}
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
  <div className="flex flex-col items-center space-y-2">
    <div className="flex flex-col items-center">
      <span className="text-[8px] font-black text-navy-400 uppercase">VEHÍCULO</span>
      <span className="text-[11px] font-black text-navy-900">
        ${(unit.monthlyLeasePayment || 0).toLocaleString()}
      </span>
      <span className="text-[7px] font-mono text-slate-400 bg-slate-50 px-1 rounded uppercase tracking-tighter">
        CTA: {cuenta}
      </span>
    </div>
    <div className="flex flex-col items-center gap-1">
      <span className="flex items-center gap-1 text-[9px] font-black text-navy-800 uppercase tracking-tighter">
        <RefreshCcw size={9} className="text-sky-500" />
        {unit.usageFreqLabel || `${(unit.maintIntervalKm || 10000).toLocaleString()} ${usageUnit}`}
      </span>
      <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
        <CalendarDays size={9} className="text-slate-300" />
        {unit.timeFreqLabel || `${unit.maintIntervalDays || 180} DÍAS`}
      </span>
    </div>
    <div className="bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
      <span className="text-[9px] font-black text-sky-700">
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
  <div className="flex flex-col items-center space-y-3">
    <div className="flex items-center gap-2 bg-sky-50 px-3 py-1 rounded border border-sky-100 shadow-sm">
      <Gauge size={13} className="text-sky-600" />
      <span className="text-[14px] font-black text-sky-900">
        {(unit.odometer || 0).toLocaleString()}
      </span>
    </div>
    <div className="flex flex-col items-center opacity-50 text-[9px] font-bold text-slate-600">
      <span>
        {(unit.lastServiceReading || 0).toLocaleString()} {usageUnit}
      </span>
      <span className="text-[7px] font-black text-slate-400 uppercase">
        {formatDate(new Date(unit.lastServiceDate || Date.now()))}
      </span>
    </div>
    <div className="flex flex-col items-center bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
      <span className="text-[7px] font-black text-amber-600 uppercase tracking-tighter">
        OBJETIVO {usageUnit}
      </span>
      <span className="text-[11px] font-black text-amber-800">
        {(unit.nextServiceReading || 0).toLocaleString()}
      </span>
    </div>
    <div className="flex items-center gap-3 pt-1 border-t border-slate-50 w-full justify-center">
      <div className="flex flex-col items-center">
        <span className="text-[6px] font-black text-slate-400 uppercase">Carga</span>
        <span className="text-[8px] font-black text-navy-800">{carga} KG</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[6px] font-black text-slate-400 uppercase">Tanque</span>
        <span className="text-[8px] font-black text-navy-800">{tanque} L</span>
      </div>
    </div>
  </div>
);

const SpecCluster = ({ unit }: { unit: FleetUnit }): React.JSX.Element => {
  const fuelType = unit.fuelType || 'S/D';
  const motor = getMockData(unit.id, 'motor', unit.motor);
  const poliza = getMockData(unit.id, 'insurancePolicyNumber', unit.insurancePolicyNumber);
  const verifDate = unit.lastEnvironmentalVerification || '2025-06-20';
  const mechDate = getMockData(
    unit.id,
    'lastMechanicalVerification',
    unit.lastMechanicalVerification
  );
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="grid grid-cols-2 gap-1 w-full">
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border justify-center ${
            fuelType.toLowerCase().includes('diesel')
              ? 'bg-emerald-50 border-emerald-100/50 text-emerald-800'
              : 'bg-amber-50 border-amber-100/50 text-amber-800'
          }`}
        >
          <Fuel size={9} />{' '}
          <span className="text-[8px] font-black uppercase tracking-tighter">{fuelType}</span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-navy-50 rounded border border-navy-100 justify-center">
          <span className="text-[8px] font-black text-navy-800 uppercase tracking-tighter">
            {motor}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase">
        <Truck size={10} className="text-slate-300" /> {unit.tireSpec || '255/70 R16'} /{' '}
        <span className="text-navy-600 font-black">
          {getMockData(unit.id, 'tireBrand', unit.tireBrand)}
        </span>
      </div>
      <div className="flex flex-col gap-1 w-full border-t border-gray-100 pt-1 mt-1">
        <div className="flex items-center justify-between text-[7px] font-black uppercase">
          <span className="text-rose-500">Seguro</span>
          <span className="text-navy-800 text-[8px]">
            {unit.insuranceExpiryDate ? formatDate(new Date(unit.insuranceExpiryDate)) : '--/--/--'}
          </span>
        </div>
        <span className="text-[7px] font-mono text-slate-400 text-right -mt-1 uppercase tracking-tighter">
          POL: {poliza}
        </span>
        <div className="flex items-center justify-between mt-0.5 text-[7px] font-black uppercase">
          <span className="text-emerald-600">Verif</span>
          <span className="text-navy-800 text-[8px]">{formatDate(new Date(verifDate))}</span>
        </div>
        <div className="flex items-center justify-between text-[7px] font-black uppercase">
          <span className="text-sky-600">Mecánica</span>
          <span className="text-navy-800 text-[8px]">{formatDate(new Date(mechDate))}</span>
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
    <div className="flex flex-col items-center space-y-2">
      <div className="flex items-center gap-1.5">
        <Zap size={10} className={isClose ? 'text-red-500' : 'text-emerald-500'} />
        <span className={`text-[11px] font-black ${isClose ? 'text-red-600' : 'text-emerald-700'}`}>
          {kmPara.toLocaleString()} {usageUnit}
        </span>
      </div>
      <div className="bg-slate-50 px-2 py-0.5 rounded opacity-60 text-[8px] font-black uppercase text-slate-500">
        BY KM: {forecast ? formatDate(forecast.serviceByKmDate) : '--/--/--'}
      </div>
      <div className="bg-sky-50 px-2 py-0.5 rounded border border-sky-100/50 text-[8px] font-black uppercase text-sky-800">
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
      className={`flex flex-col items-center p-2.5 rounded transition-all duration-500 min-w-[90px] ${
        isOverdue ? 'bg-red-500' : 'bg-emerald-50/50'
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
};

const FleetUnitRow = ({
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
  const usageUnit =
    unit.assetType?.toLowerCase().includes('veh') || unit.assetType === 'Vehiculo' ? 'KM' : 'HRS';
  const vin = getMockData(unit.id, 'numeroSerie', unit.numeroSerie);
  const tarjeta = getMockData(unit.id, 'circulationCardNumber', unit.circulationCardNumber);
  const cuenta = getMockData(unit.id, 'accountingAccount', unit.accountingAccount);
  const carga = getMockData(unit.id, 'capacidadCarga', unit.capacidadCarga);
  const tanque = getMockData(unit.id, 'fuelTankCapacity', unit.fuelTankCapacity);

  return (
    <tr
      className={`transition-all duration-300 hover:bg-[#0f2a44]/[0.015] border-b border-slate-50 ${
        forecast?.isOverdue ? 'bg-red-50/30' : ''
      }`}
    >
      <td className="py-6 text-center">
        {unit.images?.[0] ? (
          <img
            src={unit.images[0]}
            className="w-40 h-40 rounded object-cover cursor-pointer hover:scale-105 transition-transform"
            onClick={(): void => onSelectImage(unit)}
            alt={unit.id}
          />
        ) : (
          <div className="w-40 h-40 rounded bg-gray-50 flex items-center justify-center text-gray-300">
            <ImageIcon size={40} />
          </div>
        )}
      </td>
      <td className="text-center px-4">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-black text-yellow-500 bg-navy-900 px-2 py-0.5 rounded tracking-widest">
            {unit.id}
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-black text-navy-900 uppercase">
              {unit.marca} {unit.modelo}
            </span>
            <span className="text-[9px] font-bold text-slate-500">
              ({getMockData(unit.id, 'year', unit.year)}) •{' '}
              {getMockData(unit.id, 'color', unit.color)}
            </span>
          </div>
          <div className="flex flex-col items-center opacity-70">
            <span className="text-[8px] font-black text-navy-400 uppercase tracking-widest flex items-center gap-1">
              <Wrench size={10} />
              {unit.departamento}
            </span>
            <span className="text-[7px] font-mono text-slate-400">VIN: {vin}</span>
          </div>
        </div>
      </td>
      <td className="text-center px-4">
        <IdentityCluster unit={unit} tarjeta={tarjeta} />
      </td>
      <td className="text-center px-4 border-x border-slate-50">
        <LogisticsCluster unit={unit} cuenta={cuenta} usageUnit={usageUnit} />
      </td>
      <td className="py-6 px-4 min-w-[140px]">
        <OdometerCluster unit={unit} usageUnit={usageUnit} carga={carga} tanque={tanque} />
      </td>
      <td className="py-6 px-4 min-w-[180px]">
        <SpecCluster unit={unit} />
      </td>
      <td className="text-center px-4">
        <ServiceForecastCluster forecast={forecast} usageUnit={usageUnit} />
      </td>
      <td className="text-center px-4">
        <HealthStatusCluster forecast={forecast} />
      </td>
      <td className="text-center px-4">
        <FleetKpiMatrix
          availability={unit.availabilityIndex ?? 100}
          mtbf={unit.mtbfHours ?? 0}
          mttr={unit.mttrHours ?? 0}
          backlog={unit.backlogCount ?? 0}
          healthScore={unit.healthScore}
        />
      </td>
    </tr>
  );
};

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
    const unitsWithForecast = units.map((u) => ({
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
    return [...unitsWithForecast]
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
      .map((i) => i.unit);
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
      <div className="glass-card-pro bg-white p-6 overflow-x-auto">
        <table className="archon-registry-table w-full min-w-[1400px]">
          <thead>
            <tr>
              <th className="py-4 opacity-40">ACTIVO</th>
              <th
                onClick={(): void =>
                  setSortConfig((p) => ({
                    field: 'unidad',
                    direction: p.field === 'unidad' && p.direction === 'asc' ? 'desc' : 'asc',
                  }))
                }
                className="cursor-pointer hover:bg-[#0f2a44]/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  UNIDAD / MODELO
                  <span
                    className={`inline-flex ml-1 ${
                      sortConfig.field === 'unidad' ? 'opacity-100 text-[#059669]' : 'opacity-80'
                    }`}
                  >
                    {sortConfig.field === 'unidad' && sortConfig.direction === 'desc' ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronUp size={14} />
                    )}
                  </span>
                </div>
              </th>
              <th className="opacity-40">IDENTIDAD / PROPIEDAD</th>
              <th className="opacity-40">FRECUENCIAS / TARIFA</th>
              <th className="opacity-40">ODOMETRÍA (ACTUAL/ANT/OBJ)</th>
              <th className="opacity-40">CONFIG / LEGAL</th>
              <th
                onClick={(): void =>
                  setSortConfig((p) => ({
                    field: 'programacion',
                    direction: p.field === 'programacion' && p.direction === 'asc' ? 'desc' : 'asc',
                  }))
                }
                className="cursor-pointer hover:bg-[#0f2a44]/[0.02] transition-colors text-amber-600"
              >
                <div className="flex items-center justify-center gap-1">
                  KM RESTANTES
                  <span
                    className={`inline-flex ml-1 ${
                      sortConfig.field === 'programacion'
                        ? 'opacity-100 text-[#059669]'
                        : 'opacity-80'
                    }`}
                  >
                    {sortConfig.field === 'programacion' && sortConfig.direction === 'desc' ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronUp size={14} />
                    )}
                  </span>
                </div>
              </th>
              <th
                onClick={(): void =>
                  setSortConfig((p) => ({
                    field: 'pronostico',
                    direction: p.field === 'pronostico' && p.direction === 'asc' ? 'desc' : 'asc',
                  }))
                }
                className="cursor-pointer hover:bg-[#0f2a44]/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  PRONÓSTICO (FECHA)
                  <span
                    className={`inline-flex ml-1 ${
                      sortConfig.field === 'pronostico'
                        ? 'opacity-100 text-[#059669]'
                        : 'opacity-80'
                    }`}
                  >
                    {sortConfig.field === 'pronostico' && sortConfig.direction === 'desc' ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronUp size={14} />
                    )}
                  </span>
                </div>
              </th>
              <th className="opacity-40">SALUD</th>
            </tr>
          </thead>
          <tbody>
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
