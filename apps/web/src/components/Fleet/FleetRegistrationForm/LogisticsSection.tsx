import React from 'react';
import { MapPin, Gauge, Calendar, Activity, Settings } from 'lucide-react';
import ArchonField from '../../ArchonField';
import ArchonSelect from '../../ArchonSelect';
import ArchonDatePicker from '../../ArchonDatePicker';
import { UseFleetFormReturn, CatalogOption, CreateFleetUnit } from '../../../types/fleet';

type SetFormData = UseFleetFormReturn['setFormData'];

function unitLabelFor(
  assetTypes: CatalogOption[],
  assetTypeId: number | null | undefined,
  suffix: 'KM' | 'HRS' | 'KM/D' | 'HR/D'
): string {
  const selected = assetTypes.find((at) => at.id === assetTypeId);
  const isVehicle = selected?.code === 'AT_VEH' || selected?.label === 'Vehículo';
  if (suffix === 'KM/D' || suffix === 'HR/D') return isVehicle ? 'KM/D' : 'HR/D';
  return isVehicle ? 'KM' : 'HRS';
}

type LocationOdometerFieldsProps = Pick<UseFleetFormReturn, 'locations' | 'assetTypes'> & {
  formData: Pick<CreateFleetUnit, 'locationId' | 'odometer' | 'assetTypeId'>;
  setFormData: SetFormData;
};

function LocationOdometerFields({
  formData,
  setFormData,
  locations,
  assetTypes,
}: LocationOdometerFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ArchonField label="Sede de Operación" icon={MapPin}>
        <ArchonSelect
          options={locations.map((l) => ({ value: l.id.toString(), label: l.label }))}
          value={formData.locationId?.toString() || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, locationId: Number.parseInt(val, 10) }))
          }
        />
      </ArchonField>

      <ArchonField label="Lectura Base (Odómetro / Horómetro)" icon={Gauge}>
        <div className="relative flex items-center">
          <input
            type="number"
            step="0.1"
            inputMode="numeric"
            placeholder="Ej: 45000"
            className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-14 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={formData.odometer ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
              setFormData((prev) => ({
                ...prev,
                odometer: e.target.value ? Number.parseFloat(e.target.value) : undefined,
              }));
            }}
          />
          <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
            {unitLabelFor(assetTypes, formData.assetTypeId, 'KM')}
          </span>
        </div>
      </ArchonField>
    </div>
  );
}

type MaintenanceCycleGridProps = {
  formData: Pick<CreateFleetUnit, 'maintIntervalDays' | 'maintIntervalKm' | 'assetTypeId'>;
  setFormData: SetFormData;
  assetTypes: CatalogOption[];
};

function MaintenanceCycleGrid({
  formData,
  setFormData,
  assetTypes,
}: MaintenanceCycleGridProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ArchonField label="Ciclo Mto. (Fec.)" icon={Calendar}>
        <div className="relative flex items-center">
          <input
            type="number"
            placeholder="Ej: 90"
            className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-16 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={formData.maintIntervalDays ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
              setFormData((prev) => ({
                ...prev,
                maintIntervalDays: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
              }));
            }}
          />
          <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
            DÍAS
          </span>
        </div>
      </ArchonField>

      <ArchonField label="Ciclo Mto. (Uso)" icon={Activity}>
        <div className="relative flex items-center">
          <input
            type="number"
            placeholder="Ej: 5000"
            className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-16 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={formData.maintIntervalKm ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
              setFormData((prev) => ({
                ...prev,
                maintIntervalKm: e.target.value ? Number.parseFloat(e.target.value) : undefined,
              }));
            }}
          />
          <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
            {unitLabelFor(assetTypes, formData.assetTypeId, 'KM')}
          </span>
        </div>
      </ArchonField>
    </div>
  );
}

type ProtocolStartDateFieldProps = {
  formData: Pick<CreateFleetUnit, 'protocolStartDate'>;
  setFormData: SetFormData;
};

function ProtocolStartDateField({
  formData,
  setFormData,
}: ProtocolStartDateFieldProps): React.JSX.Element {
  return (
    <ArchonField label="Inicio de Protocolo Archon" icon={Calendar}>
      <ArchonDatePicker
        value={formData.protocolStartDate || new Date().toISOString().slice(0, 10)}
        onChange={(val: string): void =>
          setFormData((prev) => ({ ...prev, protocolStartDate: val }))
        }
      />
    </ArchonField>
  );
}

type MaintenanceCycleFieldsProps = {
  formData: Pick<
    CreateFleetUnit,
    'maintIntervalDays' | 'maintIntervalKm' | 'assetTypeId' | 'protocolStartDate'
  >;
  setFormData: SetFormData;
  assetTypes: CatalogOption[];
  isEdit: boolean;
};

function MaintenanceCycleFields({
  formData,
  setFormData,
  assetTypes,
  isEdit,
}: MaintenanceCycleFieldsProps): React.JSX.Element {
  return (
    <>
      <MaintenanceCycleGrid formData={formData} setFormData={setFormData} assetTypes={assetTypes} />
      {!isEdit && <ProtocolStartDateField formData={formData} setFormData={setFormData} />}
    </>
  );
}

type LastServiceFieldsProps = {
  formData: Pick<CreateFleetUnit, 'lastServiceDate' | 'lastServiceReading' | 'assetTypeId'>;
  setFormData: SetFormData;
  assetTypes: CatalogOption[];
};

function LastServiceFields({
  formData,
  setFormData,
  assetTypes,
}: LastServiceFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ArchonField label="Última Fecha de Servicio" icon={Calendar}>
        <ArchonDatePicker
          value={formData.lastServiceDate || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, lastServiceDate: val }))
          }
        />
      </ArchonField>

      <ArchonField label="Lectura en Último Servicio" icon={Gauge}>
        <div className="relative flex items-center">
          <input
            type="number"
            step="0.1"
            placeholder="Ej: 40000"
            className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-14 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={formData.lastServiceReading ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
              setFormData((prev) => ({
                ...prev,
                lastServiceReading: e.target.value ? Number.parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
            {unitLabelFor(assetTypes, formData.assetTypeId, 'KM')}
          </span>
        </div>
      </ArchonField>
    </div>
  );
}

type MaintenanceCenterUsageFieldsProps = Pick<UseFleetFormReturn, 'maintenanceCenters'> & {
  formData: Pick<CreateFleetUnit, 'maintenanceCenterId' | 'dailyUsageAvg' | 'assetTypeId'>;
  setFormData: SetFormData;
  assetTypes: CatalogOption[];
};

function MaintenanceCenterUsageFields({
  formData,
  setFormData,
  maintenanceCenters,
  assetTypes,
}: MaintenanceCenterUsageFieldsProps): React.JSX.Element {
  return (
    <>
      <ArchonField label="Centro de Gestión Autorizado" icon={Settings}>
        <ArchonSelect
          options={(maintenanceCenters || []).map((m: CatalogOption) => ({
            value: m.id.toString(),
            label: m.label,
          }))}
          value={formData.maintenanceCenterId?.toString() || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, maintenanceCenterId: Number.parseInt(val, 10) }))
          }
        />
      </ArchonField>

      <ArchonField label="Uso Promedio Diario (Km/Hr)" icon={Activity}>
        <div className="relative flex items-center">
          <input
            type="number"
            step="0.1"
            placeholder="Ej: 50.5"
            className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-16 rounded-[4px] text-archon-lg font-bold text-emerald-600 transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none font-bold"
            value={formData.dailyUsageAvg ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
              setFormData((prev) => ({
                ...prev,
                dailyUsageAvg: e.target.value ? Number.parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
            {unitLabelFor(assetTypes, formData.assetTypeId, 'KM/D')}
          </span>
        </div>
      </ArchonField>
    </>
  );
}

type LogisticsSectionProps = Pick<
  UseFleetFormReturn,
  'formData' | 'setFormData' | 'locations' | 'maintenanceCenters' | 'assetTypes'
> & {
  isEdit: boolean;
};

/** PANEL 4 — Logística estratégica & mantenimiento (sede/lectura/ciclos/servicio/uso). */
export function LogisticsSection({
  formData,
  setFormData,
  locations,
  maintenanceCenters,
  assetTypes,
  isEdit,
}: LogisticsSectionProps): React.JSX.Element {
  return (
    <div className="card-archon-sovereign bg-white p-10 space-y-8 relative z-10 [--card-accent:#0f2a44]">
      <div className="card-sovereign-header">
        <MapPin size={22} className="text-[var(--card-accent)]" />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">LOGÍSTICA & MTO.</h3>
      </div>

      <div className="space-y-6 flex-1 flex flex-col">
        <LocationOdometerFields
          formData={formData}
          setFormData={setFormData}
          locations={locations}
          assetTypes={assetTypes}
        />
        <MaintenanceCycleFields
          formData={formData}
          setFormData={setFormData}
          assetTypes={assetTypes}
          isEdit={isEdit}
        />
        <LastServiceFields formData={formData} setFormData={setFormData} assetTypes={assetTypes} />
        <MaintenanceCenterUsageFields
          formData={formData}
          setFormData={setFormData}
          maintenanceCenters={maintenanceCenters}
          assetTypes={assetTypes}
        />
      </div>
    </div>
  );
}

export default LogisticsSection;
