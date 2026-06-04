/* eslint-disable */
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import AT from '../../styles/archonTypography';

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
      <span className="text-archon-base font-black text-navy-400 uppercase tracking-[0.2em]">
        {unit.owner || 'ARIAN SILVER DE MÉXICO'}
      </span>
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
          <Tag size={11} className="text-slate-400" />
          <span className="text-archon-label font-black text-navy-800 uppercase tracking-tight">
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
          <span className="text-archon-xs font-black text-navy-900/30 uppercase tracking-tighter leading-none">
            T. CIRCULACIÓN:
          </span>
          <span className="text-archon-base font-mono text-slate-400 font-bold">
            {tarjeta || '---'}
          </span>
        </div>
      </div>
      {restriction.isRestricted && (
        <span className="text-archon-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase tracking-tighter">
          {restriction.reason}
        </span>
      )}
      <span className="flex items-center gap-1.5 text-archon-base font-black text-emerald-600 bg-emerald-50/50 px-2.5 py-1 rounded-[4px] uppercase tracking-widest border border-emerald-100/50">
        <ShieldCheck size={12} /> {unit.complianceStatus || 'OPERATIVO'}
      </span>
      <span className="flex items-center gap-1.5 text-archon-base font-black text-navy-800 bg-sky-50 px-2.5 py-1 rounded-[4px] border border-sky-100 uppercase tracking-widest shadow-sm">
        <MapPin size={11} className="text-sky-500" /> {unit.sede || 'MINA'}
      </span>
    </div>
  );
};

const LogisticsCluster = ({ unit }: { unit: FleetUnit }): React.JSX.Element => {
  const cuenta = unit.accountingAccount || '---';
  const usageUnit = unit.usageUnitName || 'KM';
  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex flex-col items-center">
        <span className="text-archon-base font-black text-navy-400 uppercase tracking-wider">
          LEASING
        </span>
        <span className="text-archon-xl font-black text-navy-900">
          $
          {Number(unit.monthlyLeasePayment || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <span className="text-archon-sm font-mono text-slate-400 bg-slate-50 px-1.5 rounded uppercase tracking-tighter mt-1">
          CTA: {cuenta}
        </span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className={`flex items-center gap-1.5 ${AT.cellValue} uppercase tracking-tighter`}>
          <RefreshCcw size={11} className="text-sky-500" />
          {unit.usageFreqLabel ||
            `${Number(unit.maintIntervalKm || 10000).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} ${usageUnit}`}
        </span>
        <span className="flex items-center gap-1.5 text-archon-base font-bold text-slate-400 uppercase tracking-tighter">
          <CalendarDays size={11} className="text-slate-300" />
          {unit.timeFreqLabel || `${unit.maintIntervalDays || 180} DÍAS`}
        </span>
      </div>
      <div className="bg-sky-50 px-2 py-1 rounded border border-sky-100 shadow-sm">
        <span className="text-archon-base font-black text-sky-700">
          {Number(unit.dailyUsageAvg || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          {usageUnit}/D
        </span>
      </div>
    </div>
  );
};

const OdometerCluster = ({ unit }: { unit: FleetUnit }): React.JSX.Element => {
  const usageUnit = unit.usageUnitName || 'KM';
  const carga = unit.capacidadCarga || 0;
  const tanque = unit.fuelTankCapacity || 0;
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center gap-3 bg-sky-50 px-4 py-2 rounded border border-sky-100 transform hover:scale-105 transition-transform">
        <Gauge size={16} className="text-sky-600" />
        <span className="text-[15px] font-black text-navy-900 tracking-tight whitespace-nowrap">
          {Number(unit.odometer || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          {usageUnit}
        </span>
      </div>
      <div className="flex flex-col items-center opacity-60 text-archon-md font-bold text-slate-600">
        <span>
          {Number(unit.lastServiceReading || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          {usageUnit}
        </span>
        <span className="text-archon-sm font-black text-slate-400 uppercase tracking-widest mt-0.5">
          {formatDateTime(new Date(unit.lastServiceDate || Date.now()))}
        </span>
      </div>
      <div className="flex flex-col items-center bg-amber-50 px-3 py-1 rounded border border-amber-100">
        <span className="text-archon-sm font-black text-amber-600 uppercase tracking-tighter">
          OBJETIVO {usageUnit}
        </span>
        <span className="text-archon-lg font-black text-amber-800">
          {Number(unit.nextServiceKmTarget ?? unit.nextServiceReading ?? 0).toLocaleString(
            'en-US',
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}
        </span>
      </div>
      <div className="flex items-center gap-4 pt-2 border-t border-slate-100 w-full justify-center">
        <div className="flex flex-col items-center">
          <span className="text-archon-xs font-black text-slate-400 uppercase">Carga</span>
          <span className="text-archon-base font-black text-navy-800">
            {Number(carga || 0).toLocaleString('en-US')} KG
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-archon-xs font-black text-slate-400 uppercase">Tanque</span>
          <span className="text-archon-base font-black text-navy-800">
            {(() => {
              const percent =
                unit.lastFuelLevel !== undefined && unit.lastFuelLevel !== null
                  ? Number(unit.lastFuelLevel)
                  : 100;
              const cap = Number(tanque || 0);
              const currentLiters = (percent / 100) * cap;
              return `${currentLiters.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} / ${cap.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} L`;
            })()}
          </span>
        </div>
      </div>
    </div>
  );
};

const HologramBadge = ({
  hologram,
  placas,
}: {
  hologram: string | null;
  placas: string | null;
}): React.JSX.Element | null => {
  if (!hologram) return null;

  const restriction = checkHoyNoCircula(hologram, placas);

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
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1">
        <div
          className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-archon-xs font-black uppercase border ${style} tracking-tighter leading-none`}
        >
          H-{hologram}
        </div>
        {restriction.isRestricted && (
          <div
            title={restriction.reason}
            className="bg-rose-500 text-white p-0.5 rounded-[4px] animate-pulse cursor-help shadow-md"
          >
            <ShieldAlert size={10} />
          </div>
        )}
      </div>
      {restriction.isRestricted && (
        <span className="text-[7px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 uppercase tracking-tighter leading-none whitespace-nowrap">
          HOY NO CIRCULA
        </span>
      )}
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
          <span className="text-archon-base font-black uppercase tracking-tighter">{fuelType}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-navy-50 rounded border border-navy-100 justify-center shadow-sm">
          <span className="text-archon-base font-black text-navy-800 uppercase tracking-tighter">
            {motor}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-archon-md font-bold text-slate-500 uppercase">
        <Truck size={12} className="text-slate-300" /> {unit.tireSpec || 'S/D'} /{' '}
        <span className="text-navy-600 font-black">{unit.tireBrand || '---'}</span>
      </div>
      <div className="flex flex-col gap-1.5 w-full border-t border-gray-100 pt-2 mt-1">
        <div className="flex items-center justify-between text-archon-sm font-black uppercase">
          <span className="text-rose-500">Seguro</span>
          <span className="text-navy-800 text-archon-base">
            {unit.insuranceExpiryDate ? formatDate(new Date(unit.insuranceExpiryDate)) : '---'}
          </span>
        </div>
        <div className="flex items-center justify-between text-archon-xs font-black uppercase -mt-0.5 mb-1">
          <span className="text-slate-400 tracking-wider">Póliza</span>
          <span className="text-archon-sm font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-[2px] border border-slate-200/60 tracking-tight shadow-sm whitespace-nowrap">
            {poliza || '---'}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1 text-archon-sm font-black uppercase">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600">VERIFICACIÓN</span>
            <HologramBadge
              hologram={unit.environmentalHologram || null}
              placas={unit.placas || null}
            />
          </div>
          <span className="text-navy-800 text-archon-base">
            {verifDate ? formatDate(verifDate) : '---'}
          </span>
        </div>
        <div className="flex items-center justify-between text-archon-sm font-black uppercase">
          <span className="text-sky-600">MECÁNICA</span>
          <span className="text-navy-800 text-archon-base">
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
        <span
          className={`text-archon-xl font-black ${isClose ? 'text-red-600' : 'text-emerald-700'}`}
        >
          {Number(kmPara).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          {usageUnit}
        </span>
      </div>
      <div className="bg-slate-50 px-2.5 py-1 rounded opacity-60 text-archon-sm font-black uppercase text-slate-500 border border-slate-100">
        BY KM: {forecast ? formatDate(forecast.serviceByKmDate) : '--/--/--'}
      </div>
      <div className="bg-sky-50 px-2.5 py-1 rounded border border-sky-100/50 text-archon-sm font-black uppercase text-sky-800 shadow-sm">
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
          className={`text-archon-base font-black uppercase tracking-[0.15em] ${
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
const FleetUnitRow = React.memo(
  ({
    unit,
    index,
    onSelectImage,
    onEdit,
  }: {
    unit: FleetUnit;
    index: number;
    onSelectImage: (u: FleetUnit) => void;
    onEdit: (u: FleetUnit) => void;
  }): React.JSX.Element => {
    const forecast = getUnitForecast(unit);
    const isOverdue = !!forecast?.isOverdue;

    const usageUnit = unit.usageUnitName || 'KM';

    return (
      <motion.tr
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        data-testid={`fleet-row-${unit.id.toLowerCase()}`}
        className={`bg-transparent border-y border-solid border-slate-200/50 hover:bg-slate-50/50 transition-all duration-300`}
      >
        <td className="py-4 px-2 text-center border-t border-solid border-slate-200 border-x-0 border-b-0">
          {unit.images?.[0] ? (
            <img
              src={unit.images[0]}
              className="w-20 h-20 block mx-auto rounded-[4px] shadow-sm object-cover cursor-pointer hover:scale-105 transition-transform"
              onClick={(): void => onSelectImage(unit)}
              alt={unit.id}
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
                const imgElement = e.currentTarget;
                imgElement.src = '/img/archon-unit-placeholder.png';
              }}
            />
          ) : (
            <div
              className="w-20 h-20 mx-auto rounded-[4px] bg-gray-50 flex items-center justify-center border border-dashed border-gray-200 cursor-pointer overflow-hidden relative"
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

        <td className="text-center px-3 border-t border-solid border-slate-200 border-x-0 border-b-0">
          <div className="flex flex-col items-center gap-2">
            <span className="text-archon-lg font-black text-yellow-500 bg-navy-900 px-3 py-1 rounded tracking-[0.2em]">
              {unit.id}
            </span>
            <div className="flex flex-col items-center">
              <span className="text-archon-xl font-black text-navy-900 uppercase tracking-tight">
                {unit.marca} {unit.modelo}
              </span>
              <span className="text-archon-md font-bold text-slate-500 mt-0.5">
                ({unit.year || 'SIN REGISTRO'}) • {unit.color || 'SIN REGISTRO'}
              </span>
            </div>
            <div className="flex flex-col items-center opacity-80 pt-1">
              <span className="text-archon-base font-black text-navy-400 uppercase tracking-widest flex items-center gap-1.5">
                <Wrench size={12} />
                {unit.departamento || 'SIN REGISTRO'}
              </span>
              <span className="text-archon-sm font-mono text-slate-400 mt-1">
                VIN: {unit.numeroSerie || '---'}
              </span>
            </div>
          </div>
        </td>

        <td className="text-center px-3 border-t border-solid border-slate-200 border-x-0 border-b-0">
          <IdentityCluster unit={unit} tarjeta={unit.circulationCardNumber || '---'} />
        </td>

        <td className="text-center px-3 border-t border-solid border-slate-200 border-x-0 border-b-0">
          <LogisticsCluster unit={unit} />
        </td>

        <td className="py-4 px-2 min-w-[140px] text-center border-t border-solid border-slate-200 border-x-0 border-b-0">
          <OdometerCluster unit={unit} />
        </td>

        <td className="py-4 px-2 min-w-[180px] text-center border-t border-solid border-slate-200 border-x-0 border-b-0">
          <SpecCluster unit={unit} />
        </td>

        <td className="text-center px-3 border-t border-solid border-slate-200 border-x-0 border-b-0">
          <ServiceForecastCluster forecast={forecast} usageUnit={usageUnit} />
        </td>

        <td className="text-center px-3 border-t border-solid border-slate-200 border-x-0 border-b-0">
          <HealthStatusCluster forecast={forecast} />
        </td>

        <td className="text-center px-3 border-t border-solid border-slate-200 border-x-0 border-b-0">
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

        <td className="text-center px-3 border-t border-solid border-slate-200 border-x-0 border-b-0">
          <div className="flex gap-2 justify-center">
            <Link
              to={`/dashboard/fleet/${unit.id}`}
              title="Ver nodo completo de la unidad"
              className="flex items-center justify-center w-10 h-10 text-[#0f2a44] bg-[#0f2a44]/5 hover:bg-[#0f2a44]/10 transition-all duration-300 rounded-[4px] hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm group"
            >
              <ExternalLink
                size={16}
                className="transition-transform duration-300 group-hover:scale-110"
              />
            </Link>
            <button
              onClick={(): void => onEdit(unit)}
              title="Editar Activo (Auditado)"
              className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all duration-300 rounded-[4px] hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm group border-none outline-none"
            >
              <Pencil
                size={18}
                className="transition-transform duration-300 group-hover:rotate-12"
              />
            </button>
          </div>
        </td>
      </motion.tr>
    );
  }
);

// ============================================================================
// UNIVERSAL SEARCH SPECIFICATIONS (DRY COMPLIANT)
// ============================================================================
interface SearchConfig {
  key: keyof FleetUnit;
  label: string;
  type: 'string' | 'numeric';
  suffix?: string;
}

const SEARCH_CONFIGS: SearchConfig[] = [
  { key: 'placas', label: 'Placas', type: 'string' },
  { key: 'marca', label: 'Marca', type: 'string' },
  { key: 'modelo', label: 'Modelo', type: 'string' },
  { key: 'sede', label: 'Sede', type: 'string' },
  { key: 'departamento', label: 'Depto', type: 'string' },
  { key: 'owner', label: 'Propietario', type: 'string' },
  { key: 'complianceStatus', label: 'Cumplimiento', type: 'string' },
  { key: 'status', label: 'Estado', type: 'string' },
  { key: 'assetType', label: 'Tipo', type: 'string' },
  { key: 'fuelType', label: 'Combustible', type: 'string' },
  { key: 'traccion', label: 'Tracción', type: 'string' },
  { key: 'transmision', label: 'Transmisión', type: 'string' },
  { key: 'numeroSerie', label: 'VIN/Serie', type: 'string' },
  { key: 'circulationCardNumber', label: 'Tarjeta Circ.', type: 'string' },
  { key: 'accountingAccount', label: 'Cta. Contable', type: 'string' },
  { key: 'insurancePolicyNumber', label: 'Póliza Seguro', type: 'string' },
  { key: 'motor', label: 'Motor', type: 'string' },
  { key: 'tireBrand', label: 'Llantas Marca', type: 'string' },
  { key: 'tireSpec', label: 'Llantas Medida', type: 'string' },
  { key: 'color', label: 'Color', type: 'string' },
  // Quantitative/Numeric Fields
  { key: 'monthlyLeasePayment', label: 'Leasing', type: 'numeric', suffix: ' USD' },
  { key: 'odometer', label: 'Odómetro', type: 'numeric', suffix: ' KM/Hrs' },
  { key: 'lastServiceReading', label: 'Último Servicio', type: 'numeric', suffix: ' KM/Hrs' },
  { key: 'nextServiceReading', label: 'Objetivo Servicio', type: 'numeric', suffix: ' KM/Hrs' },
  {
    key: 'nextServiceKmTarget',
    label: 'Objetivo Servicio Target',
    type: 'numeric',
    suffix: ' KM/Hrs',
  },
  { key: 'capacidadCarga', label: 'Carga', type: 'numeric', suffix: ' KG' },
  { key: 'fuelTankCapacity', label: 'Tanque', type: 'numeric', suffix: ' L' },
  { key: 'maintIntervalKm', label: 'Frec. Uso', type: 'numeric', suffix: ' KM/Hrs' },
  { key: 'maintIntervalDays', label: 'Frec. Tiempo', type: 'numeric', suffix: ' Días' },
  { key: 'dailyUsageAvg', label: 'Uso Diario', type: 'numeric', suffix: ' U/D' },
];

const matchFieldInUnit = (u: FleetUnit, query: string): { label: string; value: string } | null => {
  if (u.id && u.id.toLowerCase().includes(query)) {
    return { label: 'Código', value: u.id };
  }

  const forecast = calculateMaintForecast(
    u.maintIntervalDays,
    u.maintIntervalKm,
    u.dailyUsageAvg || 0,
    u.odometer,
    u.lastServiceReading || 0,
    u.lastServiceDate || null
  );

  if (forecast) {
    const kmPara = forecast.kmParaServicio;
    const usageUnit = u.usageUnitName || 'KM';
    const numStr = String(kmPara);
    const formattedStr = Number(kmPara).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    if (numStr.includes(query) || formattedStr.toLowerCase().includes(query)) {
      return { label: 'Km. Restantes', value: `${formattedStr} ${usageUnit}` };
    }
  }

  const foundConfig = SEARCH_CONFIGS.find((cfg) => {
    const val = u[cfg.key];
    if (val === null || val === undefined) return false;

    if (cfg.type === 'string') {
      return String(val).toLowerCase().includes(query);
    }
    const numStr = String(val);
    const formattedStr = Number(val).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return numStr.includes(query) || formattedStr.toLowerCase().includes(query);
  });

  if (foundConfig) {
    const val = u[foundConfig.key];
    const formattedValue =
      foundConfig.type === 'string'
        ? String(val)
        : `${Number(val).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}${foundConfig.suffix || ''}`;

    return { label: foundConfig.label, value: formattedValue };
  }

  if (u.year && String(u.year).includes(query)) {
    return { label: 'Año', value: String(u.year) };
  }

  return null;
};

// ============================================================================
// MAIN COMPONENT: FleetGridView
// ============================================================================
export const FleetGridView = ({
  units = [],
  loading = false,
  onEdit,
}: FleetGridViewProps): React.JSX.Element => {
  const { getUnitDetails } = useFleet();
  const { searchTerm, setSearchTerm, setSearchConfig } = useSovereignLayout();
  const [selectedGalleryUnit, setSelectedGalleryUnit] = useState<FleetUnit | null>(null);
  const [isFetchingImages, setIsFetchingImages] = useState(false);

  // 🛡️ Dynamic Register for Universal Search Protocol (DRY Compliant)
  React.useEffect(() => {
    setSearchConfig({
      placeholder: 'Buscar por placas, marca, modelo, sede o departamento...',
      getSuggestions: (term: string) => {
        const query = term.toLowerCase().trim();
        return (units || [])
          .filter((u) => u && u.id)
          .map((u) => {
            const match = matchFieldInUnit(u, query);
            if (!match) return null;
            return {
              id: u.id,
              title: u.id,
              subtitle: `${u.marca} ${u.modelo}`,
              metaLabel: match.label,
              metaValue: match.value,
              rawItem: u,
            };
          })
          .filter((s): s is any => s !== null);
      },
      onSuggestionSelect: (suggestion) => {
        setSearchTerm(suggestion.id);
      },
    });

    return () => {
      setSearchConfig(null);
    };
  }, [units, setSearchConfig, setSearchTerm]);

  // 🛡️ Auto-cleanup Search Term on Unmount (Resilience Protocol)
  React.useEffect(() => {
    return () => {
      setSearchTerm('');
    };
  }, [setSearchTerm]);

  // 🛡️ Data Integrity Sentinel: Filter out invalid records to prevent render crashes
  const sanitizedUnits = React.useMemo(() => {
    return (units || []).filter((u) => u && u.id);
  }, [units]);

  const handleSelectImage = useCallback(
    async (unit: FleetUnit): Promise<void> => {
      // 🔱 Atomic Hydration Trigger with Defensive Fail-Safe
      if (!unit.images || unit.images.length === 0) {
        setIsFetchingImages(true);
        try {
          const fullUnit = await getUnitDetails(unit.id);
          setSelectedGalleryUnit(fullUnit || unit);
        } catch (error) {
          console.error('[Archon Visualizer] Failed to hydrate unit images:', error);
          setSelectedGalleryUnit(unit); // Fallback to local unit details
        } finally {
          setIsFetchingImages(false);
        }
      } else {
        setSelectedGalleryUnit(unit);
      }
    },
    [getUnitDetails]
  );

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

  // 🔍 Multicriteria Filter Logic (ACOP Compliant & Offline Resilient)
  const filteredUnits = React.useMemo((): FleetUnit[] => {
    if (!searchTerm.trim()) return sortedUnits;
    const term = searchTerm.toLowerCase().trim();

    const queryableKeys: { key: keyof FleetUnit; type: 'string' | 'numeric' }[] = [
      { key: 'placas', type: 'string' },
      { key: 'marca', type: 'string' },
      { key: 'modelo', type: 'string' },
      { key: 'sede', type: 'string' },
      { key: 'departamento', type: 'string' },
      { key: 'owner', type: 'string' },
      { key: 'complianceStatus', type: 'string' },
      { key: 'status', type: 'string' },
      { key: 'assetType', type: 'string' },
      { key: 'fuelType', type: 'string' },
      { key: 'traccion', type: 'string' },
      { key: 'transmision', type: 'string' },
      { key: 'numeroSerie', type: 'string' },
      { key: 'circulationCardNumber', type: 'string' },
      { key: 'accountingAccount', type: 'string' },
      { key: 'insurancePolicyNumber', type: 'string' },
      { key: 'motor', type: 'string' },
      { key: 'tireBrand', type: 'string' },
      { key: 'tireSpec', type: 'string' },
      { key: 'color', type: 'string' },
      // Numeric
      { key: 'monthlyLeasePayment', type: 'numeric' },
      { key: 'odometer', type: 'numeric' },
      { key: 'lastServiceReading', type: 'numeric' },
      { key: 'nextServiceReading', type: 'numeric' },
      { key: 'capacidadCarga', type: 'numeric' },
      { key: 'fuelTankCapacity', type: 'numeric' },
      { key: 'maintIntervalKm', type: 'numeric' },
      { key: 'maintIntervalDays', type: 'numeric' },
      { key: 'dailyUsageAvg', type: 'numeric' },
    ];

    return sortedUnits.filter((u) => {
      // 1. Calculate Dynamic remaining kilometers
      const forecast = calculateMaintForecast(
        u.maintIntervalDays,
        u.maintIntervalKm,
        u.dailyUsageAvg || 0,
        u.odometer,
        u.lastServiceReading || 0,
        u.lastServiceDate || null
      );

      let matchesKmPara = false;
      if (forecast) {
        const kmPara = forecast.kmParaServicio;
        const numStr = String(kmPara);
        const formattedStr = Number(kmPara).toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
        matchesKmPara = numStr.includes(term) || formattedStr.toLowerCase().includes(term);
      }

      // 2. Scan structured database keys
      const matchesKey = queryableKeys.some((cfg) => {
        const val = u[cfg.key];
        if (val === null || val === undefined) return false;

        if (cfg.type === 'string') {
          return String(val).toLowerCase().includes(term);
        } else {
          const numStr = String(val);
          const formattedStr = Number(val).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          });
          return numStr.includes(term) || formattedStr.toLowerCase().includes(term);
        }
      });

      const matchesId = u.id && u.id.toLowerCase().includes(term);
      const matchesYear = u.year && String(u.year).includes(term);
      return matchesId || matchesYear || matchesKmPara || matchesKey;
    });
  }, [sortedUnits, searchTerm]);

  const headers: ArchonTableHeader[] = [
    { key: 'activo', label: 'ACTIVO', width: '100px' },
    { key: 'unidad', label: 'UNIDAD', sortable: true, width: '105px' },
    { key: 'identidad', label: 'IDENTIDAD', width: '145px' },
    { key: 'logistica', label: 'LOGÍSTICA', width: '125px' },
    { key: 'odometria', label: 'ODOMETRÍA', width: '130px' },
    { key: 'configuracion', label: 'CONFIGURACIÓN', width: '210px' },
    { key: 'programacion', label: 'KM RESTANTES', sortable: true, width: '120px' },
    { key: 'pronostico', label: 'PRONÓSTICO', sortable: true, width: '110px' },
    { key: 'salud', label: 'SALUD', width: '140px' },
    {
      key: 'acciones',
      label: 'ACCIONES',
      width: '65px',
    },
  ];

  return (
    <div className="animate-in fade-in duration-700 space-y-[20px] text-[#0f2a44]">
      {selectedGalleryUnit && (
        <ArchonGalleryOverlay
          images={
            selectedGalleryUnit.images && selectedGalleryUnit.images.length > 0
              ? selectedGalleryUnit.images
              : ['/img/archon-unit-placeholder.png']
          }
          assetId={selectedGalleryUnit.id}
          onClose={(): void => setSelectedGalleryUnit(null)}
        />
      )}
      <ArchonDataTable
        testId="fleet-inventory-table"
        loading={loading}
        loadingMessage="Sincronizando Activos..."
        data={filteredUnits}
        emptyMessage={
          searchTerm
            ? `Ningún activo coincide con: "${searchTerm.toUpperCase()}"`
            : 'No hay registros disponibles-'
        }
        headers={headers}
        onSort={(key): void => {
          const field = key as 'unidad' | 'programacion' | 'pronostico';
          setSortConfig((p) => ({
            field,
            direction: p.field === field && p.direction === 'asc' ? 'desc' : 'asc',
          }));
        }}
        sortConfig={sortConfig}
        renderRow={(unit, index): React.ReactElement => (
          <FleetUnitRow
            key={unit.id}
            unit={unit}
            index={index}
            onSelectImage={handleSelectImage}
            onEdit={onEdit}
          />
        )}
      />
      {isFetchingImages && (
        <div className="fixed bottom-10 right-10 bg-navy-900 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce z-[100] flex items-center gap-3">
          <RefreshCcw size={20} className="animate-spin text-yellow-400" />
          <span className="text-xs font-black uppercase tracking-widest">
            Hidratando Activos...
          </span>
        </div>
      )}
    </div>
  );
};

export default FleetGridView;
