import React from 'react';
import { Cpu, Calendar, Activity, Gauge, Settings, Truck, Zap, MapPin } from 'lucide-react';
import ArchonField from '../../ArchonField';
import ArchonSelect from '../../ArchonSelect';
import { UseFleetFormReturn, CatalogOption, CreateFleetUnit } from '../../../types/fleet';

type SetFormData = UseFleetFormReturn['setFormData'];

type YearColorFieldsProps = Pick<UseFleetFormReturn, 'colors'> & {
  formData: Pick<CreateFleetUnit, 'year' | 'colorId'>;
  setFormData: SetFormData;
};

function YearColorFields({
  formData,
  setFormData,
  colors,
}: YearColorFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ArchonField label="Año de Fabricación" icon={Calendar} required>
        <input
          required
          type="number"
          min={1990}
          max={2030}
          placeholder="Ej: 2024"
          className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono"
          value={formData.year ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
            setFormData((prev) => ({
              ...prev,
              year: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
            }))
          }
        />
      </ArchonField>
      <ArchonField label="Color Dominante" icon={Activity}>
        <ArchonSelect
          options={(colors || []).map((c: CatalogOption) => ({
            value: c.id.toString(),
            label: c.label,
          }))}
          value={formData.colorId?.toString() || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, colorId: Number.parseInt(val, 10) }))
          }
        />
      </ArchonField>
    </div>
  );
}

type DrivetrainFieldsProps = Pick<UseFleetFormReturn, 'driveTypes' | 'transmissionTypes'> & {
  formData: Pick<CreateFleetUnit, 'traccionId' | 'transmisionId'>;
  setFormData: SetFormData;
};

function DrivetrainFields({
  formData,
  setFormData,
  driveTypes,
  transmissionTypes,
}: DrivetrainFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ArchonField label="Tracción / Drive" icon={Gauge}>
        <ArchonSelect
          options={driveTypes.map((t: CatalogOption) => ({
            value: t.id.toString(),
            label: t.label,
          }))}
          value={formData.traccionId?.toString() || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, traccionId: Number.parseInt(val, 10) }))
          }
        />
      </ArchonField>
      <ArchonField label="Transmisión" icon={Settings}>
        <ArchonSelect
          options={transmissionTypes.map((t: CatalogOption) => ({
            value: t.id.toString(),
            label: t.label,
          }))}
          value={formData.transmisionId?.toString() || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, transmisionId: Number.parseInt(val, 10) }))
          }
        />
      </ArchonField>
    </div>
  );
}

type EngineFuelTypeFieldsProps = Pick<UseFleetFormReturn, 'engineTypes' | 'fuelTypes'> & {
  formData: Pick<CreateFleetUnit, 'engineTypeId' | 'fuelTypeId'>;
  setFormData: SetFormData;
};

function EngineFuelTypeFields({
  formData,
  setFormData,
  engineTypes,
  fuelTypes,
}: EngineFuelTypeFieldsProps): React.JSX.Element {
  return (
    <>
      <ArchonField label="Configuración de Motor" icon={Activity}>
        <ArchonSelect
          options={engineTypes.map((e: CatalogOption) => ({
            value: e.id.toString(),
            label: e.label,
          }))}
          value={formData.engineTypeId?.toString() || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, engineTypeId: Number.parseInt(val, 10) }))
          }
        />
      </ArchonField>
      <ArchonField label="Combustible" icon={Zap}>
        <ArchonSelect
          options={fuelTypes.map((t: CatalogOption) => ({
            value: t.id.toString(),
            label: t.label,
          }))}
          value={formData.fuelTypeId?.toString() || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, fuelTypeId: Number.parseInt(val, 10) }))
          }
        />
      </ArchonField>
    </>
  );
}

type CapacityFieldsProps = {
  formData: Pick<CreateFleetUnit, 'capacidadCarga' | 'fuelTankCapacity'>;
  setFormData: SetFormData;
};

function CapacityFields({ formData, setFormData }: CapacityFieldsProps): React.JSX.Element {
  return (
    <>
      <ArchonField label="Capacidad de Carga" icon={Truck}>
        <div className="relative flex items-center">
          <input
            type="number"
            step="0.1"
            placeholder="Ej: 1500.0"
            className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-14 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={formData.capacidadCarga ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
              setFormData((prev) => ({
                ...prev,
                capacidadCarga: e.target.value ? Number.parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
            KG
          </span>
        </div>
      </ArchonField>
      <ArchonField label="Capacidad Combustible" icon={Zap} required>
        <div className="relative flex items-center">
          <input
            required
            type="number"
            step="0.1"
            placeholder="Ej: 80.0"
            className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-14 rounded-[4px] text-archon-lg font-bold text-[#f2b705] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none font-bold"
            value={formData.fuelTankCapacity ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
              setFormData((prev) => ({
                ...prev,
                fuelTankCapacity: e.target.value ? Number.parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
            LTS
          </span>
        </div>
      </ArchonField>
    </>
  );
}

type FuelLevelFieldProps = {
  formData: Pick<CreateFleetUnit, 'lastFuelLevel' | 'initialFuelLevel'>;
  setFormData: SetFormData;
  isEdit: boolean;
};

function FuelLevelField({ formData, setFormData, isEdit }: FuelLevelFieldProps): React.JSX.Element {
  return (
    <ArchonField
      label={isEdit ? 'Nivel de Combustible Actual' : 'Nivel de Combustible Inicial'}
      icon={Zap}
      required
      className="col-span-2"
    >
      <div className="relative flex items-center">
        <input
          required
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="Ej: 100.00"
          className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-14 rounded-[4px] text-archon-lg font-bold text-[#f2b705] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none font-bold"
          value={isEdit ? formData.lastFuelLevel ?? '' : formData.initialFuelLevel ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
            const val = e.target.value ? Number.parseFloat(e.target.value) : undefined;
            if (isEdit) {
              setFormData((prev) => ({ ...prev, lastFuelLevel: val }));
            } else {
              setFormData((prev) => ({ ...prev, initialFuelLevel: val, lastFuelLevel: val }));
            }
          }}
        />
        <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
          %
        </span>
      </div>
    </ArchonField>
  );
}

type TireSpecFieldsProps = Pick<UseFleetFormReturn, 'tireBrands'> & {
  formData: Pick<CreateFleetUnit, 'tireSpec' | 'tireBrandId'>;
  setFormData: SetFormData;
};

function TireSpecFields({
  formData,
  setFormData,
  tireBrands,
}: TireSpecFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ArchonField label="Medida de Llanta" icon={Activity}>
        <input
          type="text"
          placeholder="Ej: 265/65 R17"
          className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono"
          value={formData.tireSpec ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
            setFormData((prev) => ({ ...prev, tireSpec: e.target.value }))
          }
        />
      </ArchonField>
      <ArchonField label="Marca de Llanta" icon={Truck}>
        <ArchonSelect
          options={tireBrands.map((b: CatalogOption) => ({
            value: b.id.toString(),
            label: b.label,
          }))}
          value={formData.tireBrandId?.toString() || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, tireBrandId: Number.parseInt(val, 10) }))
          }
        />
      </ArchonField>
    </div>
  );
}

type TerrainFieldProps = Pick<UseFleetFormReturn, 'terrainTypes'> & {
  formData: Pick<CreateFleetUnit, 'terrainTypeId'>;
  setFormData: SetFormData;
};

function TerrainField({
  formData,
  setFormData,
  terrainTypes,
}: TerrainFieldProps): React.JSX.Element {
  return (
    <ArchonField label="Perfil de Terreno Dominante" icon={MapPin}>
      <ArchonSelect
        options={terrainTypes.map((t: CatalogOption) => ({
          value: t.id.toString(),
          label: t.label,
        }))}
        value={formData.terrainTypeId?.toString() || ''}
        onChange={(val: string): void =>
          setFormData((prev) => ({ ...prev, terrainTypeId: Number.parseInt(val, 10) }))
        }
      />
    </ArchonField>
  );
}

type TireTerrainFieldsProps = Pick<UseFleetFormReturn, 'tireBrands' | 'terrainTypes'> & {
  formData: Pick<CreateFleetUnit, 'tireSpec' | 'tireBrandId' | 'terrainTypeId'>;
  setFormData: SetFormData;
};

function TireTerrainFields({
  formData,
  setFormData,
  tireBrands,
  terrainTypes,
}: TireTerrainFieldsProps): React.JSX.Element {
  return (
    <div className="pt-4 border-t border-slate-100 space-y-6">
      <h4 className="text-archon-base font-black text-navy-400 uppercase tracking-[0.2em]">
        Especificaciones de Rodado & Terreno
      </h4>
      <TireSpecFields formData={formData} setFormData={setFormData} tireBrands={tireBrands} />
      <TerrainField formData={formData} setFormData={setFormData} terrainTypes={terrainTypes} />
    </div>
  );
}

type TechnicalProfileSectionProps = Pick<
  UseFleetFormReturn,
  | 'formData'
  | 'setFormData'
  | 'colors'
  | 'driveTypes'
  | 'transmissionTypes'
  | 'engineTypes'
  | 'fuelTypes'
  | 'tireBrands'
  | 'terrainTypes'
> & {
  isEdit: boolean;
};

/** PANEL 3 — Perfil técnico (año/color/tracción/transmisión/motor/combustible/rodado). */
export function TechnicalProfileSection({
  formData,
  setFormData,
  colors,
  driveTypes,
  transmissionTypes,
  engineTypes,
  fuelTypes,
  tireBrands,
  terrainTypes,
  isEdit,
}: TechnicalProfileSectionProps): React.JSX.Element {
  return (
    <div className="card-archon-sovereign bg-white p-10 space-y-8 relative z-10 [--card-accent:#0f2a44]">
      <div className="card-sovereign-header">
        <Cpu size={22} className="text-[var(--card-accent)]" />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">PERFIL TÉCNICO</h3>
      </div>

      <div className="space-y-6 flex-1 flex flex-col">
        <YearColorFields formData={formData} setFormData={setFormData} colors={colors} />
        <DrivetrainFields
          formData={formData}
          setFormData={setFormData}
          driveTypes={driveTypes}
          transmissionTypes={transmissionTypes}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EngineFuelTypeFields
            formData={formData}
            setFormData={setFormData}
            engineTypes={engineTypes}
            fuelTypes={fuelTypes}
          />
          <CapacityFields formData={formData} setFormData={setFormData} />
          <FuelLevelField formData={formData} setFormData={setFormData} isEdit={isEdit} />
        </div>

        <TireTerrainFields
          formData={formData}
          setFormData={setFormData}
          tireBrands={tireBrands}
          terrainTypes={terrainTypes}
        />
      </div>
    </div>
  );
}

export default TechnicalProfileSection;
