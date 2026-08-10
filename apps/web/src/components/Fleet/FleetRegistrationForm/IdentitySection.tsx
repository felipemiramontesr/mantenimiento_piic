import React from 'react';
import {
  ShieldCheck,
  Zap,
  Truck,
  Settings,
  Tag,
  Layers,
  PlusCircle,
  Activity,
  Wrench,
} from 'lucide-react';
import ArchonField from '../../ArchonField';
import ArchonSelect from '../../ArchonSelect';
import ArchonImageUploader from '../../ArchonImageUploader';
import { UseFleetFormReturn, CatalogOption, CreateFleetUnit } from '../../../types/fleet';

interface FlotillaOnlyFieldProps {
  show: boolean;
  children: React.ReactNode;
}

const FlotillaOnlyField: React.FC<FlotillaOnlyFieldProps> = ({ show, children }) => {
  if (!show) return null;
  return <>{children}</>;
};

function flotillaGridClass(show: boolean): string {
  return `grid gap-6 ${show ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`;
}

type SetFormData = UseFleetFormReturn['setFormData'];

type HierarchyFieldsProps = Pick<
  UseFleetFormReturn,
  | 'assetTypes'
  | 'marcas'
  | 'modelos'
  | 'isLoading'
  | 'handleAssetTypeChange'
  | 'handleMarcaChange'
  | 'handleModeloChange'
> & {
  formData: Pick<CreateFleetUnit, 'assetTypeId' | 'brandId' | 'modelId'>;
};

function HierarchyFields({
  formData,
  assetTypes,
  marcas,
  modelos,
  isLoading,
  handleAssetTypeChange,
  handleMarcaChange,
  handleModeloChange,
}: HierarchyFieldsProps): React.JSX.Element {
  return (
    <>
      <ArchonField label="1. Tipo de Activo" icon={Zap} required>
        <ArchonSelect
          options={assetTypes.map((t: CatalogOption) => ({
            value: t.id.toString(),
            label: t.label,
          }))}
          value={formData.assetTypeId?.toString() || ''}
          onChange={(val: string): void => handleAssetTypeChange(parseInt(val, 10))}
        />
      </ArchonField>

      <ArchonField label="2. Identidad de Marca" icon={Truck} required>
        <ArchonSelect
          disabled={!formData.assetTypeId}
          options={marcas.map((m: CatalogOption) => ({
            value: m.id.toString(),
            label: m.label,
          }))}
          placeholder={isLoading ? 'Sincronizando...' : 'Seleccionar marca...'}
          value={formData.brandId?.toString() || ''}
          onChange={(val: string): void => handleMarcaChange(parseInt(val, 10))}
        />
      </ArchonField>

      <ArchonField label="3. Especificación de Modelo" icon={Settings} required>
        <ArchonSelect
          disabled={!formData.brandId}
          options={modelos.map((m: CatalogOption) => ({
            value: m.id.toString(),
            label: m.label,
          }))}
          placeholder={isLoading ? 'Sincronizando...' : 'Seleccionar modelo...'}
          value={formData.modelId?.toString() || ''}
          onChange={(val: string): void => handleModeloChange(parseInt(val, 10))}
        />
      </ArchonField>
    </>
  );
}

type IdAndOwnerFieldsProps = Pick<UseFleetFormReturn, 'owners'> & {
  formData: Pick<CreateFleetUnit, 'id' | 'ownerId'>;
  setFormData: SetFormData;
};

function IdAndOwnerFields({
  formData,
  setFormData,
  owners,
}: IdAndOwnerFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ArchonField label="Número Económico" icon={Tag} required>
        <input
          required
          type="text"
          placeholder="Ej: VEH-001"
          className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-bold text-lg tracking-widest text-[#0f2a44]"
          value={formData.id}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
            setFormData((prev) => ({ ...prev, id: e.target.value }))
          }
        />
      </ArchonField>
      <ArchonField label="Estatus de Propiedad" icon={Layers}>
        <ArchonSelect
          options={owners.map((o: CatalogOption) => ({
            value: o.id.toString(),
            label: o.label,
          }))}
          value={formData.ownerId?.toString() || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, ownerId: parseInt(val, 10) }))
          }
        />
      </ArchonField>
    </div>
  );
}

type PlatesAndSerialFieldsProps = {
  formData: Pick<CreateFleetUnit, 'placas' | 'numeroSerie'>;
  setFormData: SetFormData;
};

function PlatesAndSerialFields({
  formData,
  setFormData,
}: PlatesAndSerialFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ArchonField label="Placas / Matrícula" icon={Tag}>
        <input
          type="text"
          placeholder="Ej: XX-1234-A"
          className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none uppercase font-mono"
          value={formData.placas ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
            setFormData((prev) => ({ ...prev, placas: e.target.value.toUpperCase() }))
          }
        />
      </ArchonField>
      <ArchonField label="Número de Serie / VIN" icon={ShieldCheck}>
        <input
          type="text"
          placeholder="Ej: 3VW... (17 caracteres)"
          className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono"
          value={formData.numeroSerie ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
            setFormData((prev) => ({ ...prev, numeroSerie: e.target.value }))
          }
        />
      </ArchonField>
    </div>
  );
}

type IdentifiersFieldsProps = Pick<UseFleetFormReturn, 'owners'> & {
  formData: Pick<CreateFleetUnit, 'id' | 'ownerId' | 'placas' | 'numeroSerie'>;
  setFormData: SetFormData;
};

function IdentifiersFields({
  formData,
  setFormData,
  owners,
}: IdentifiersFieldsProps): React.JSX.Element {
  return (
    <>
      <IdAndOwnerFields formData={formData} setFormData={setFormData} owners={owners} />
      <PlatesAndSerialFields formData={formData} setFormData={setFormData} />
    </>
  );
}

type UsageAndPhotoFieldsProps = Pick<UseFleetFormReturn, 'useTypes' | 'departments'> & {
  formData: Pick<CreateFleetUnit, 'operationalUseId' | 'departmentId' | 'images'>;
  setFormData: SetFormData;
  isFlotillaOrInternal: boolean;
};

function UsageAndPhotoFields({
  formData,
  setFormData,
  useTypes,
  departments,
  isFlotillaOrInternal,
}: UsageAndPhotoFieldsProps): React.JSX.Element {
  return (
    <>
      <div className={flotillaGridClass(isFlotillaOrInternal)}>
        <ArchonField label="Uso Operativo" icon={Activity} required>
          <ArchonSelect
            options={useTypes.map((u: CatalogOption) => ({
              value: u.id.toString(),
              label: u.label,
            }))}
            value={formData.operationalUseId?.toString() ?? ''}
            onChange={(val: string): void =>
              setFormData((prev) => ({ ...prev, operationalUseId: parseInt(val, 10) }))
            }
          />
        </ArchonField>
        <FlotillaOnlyField show={isFlotillaOrInternal}>
          <ArchonField label="Departamento Responsable" icon={Wrench} required>
            <ArchonSelect
              options={departments.map((d: CatalogOption) => ({
                value: d.id.toString(),
                label: d.label,
              }))}
              value={formData.departmentId?.toString() ?? ''}
              onChange={(val: string): void =>
                setFormData((prev) => ({ ...prev, departmentId: parseInt(val, 10) }))
              }
            />
          </ArchonField>
        </FlotillaOnlyField>
      </div>

      <ArchonField label="Evidencia Fotográfica" icon={PlusCircle}>
        <ArchonImageUploader
          compact
          images={formData.images ?? []}
          onChange={(imgs: string[]): void => setFormData((prev) => ({ ...prev, images: imgs }))}
          maxImages={4}
        />
      </ArchonField>
    </>
  );
}

type IdentitySectionProps = Pick<
  UseFleetFormReturn,
  | 'formData'
  | 'setFormData'
  | 'assetTypes'
  | 'marcas'
  | 'modelos'
  | 'owners'
  | 'useTypes'
  | 'departments'
  | 'isLoading'
  | 'handleAssetTypeChange'
  | 'handleMarcaChange'
  | 'handleModeloChange'
> & {
  isFlotillaOrInternal: boolean;
};

/** PANEL 1 — Motor de jerarquía (tipo/marca/modelo/ID/placas/uso/depto/fotos). */
export function IdentitySection({
  formData,
  setFormData,
  assetTypes,
  marcas,
  modelos,
  owners,
  useTypes,
  departments,
  isLoading,
  handleAssetTypeChange,
  handleMarcaChange,
  handleModeloChange,
  isFlotillaOrInternal,
}: IdentitySectionProps): React.JSX.Element {
  return (
    <div className="card-archon-sovereign bg-white p-10 space-y-8 relative z-20 [--card-accent:#0f2a44]">
      <div className="card-sovereign-header">
        <Layers className="text-[var(--card-accent)]" size={22} />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">IDENTIDAD</h3>
      </div>

      <div className="space-y-6 relative z-10">
        <HierarchyFields
          formData={formData}
          assetTypes={assetTypes}
          marcas={marcas}
          modelos={modelos}
          isLoading={isLoading}
          handleAssetTypeChange={handleAssetTypeChange}
          handleMarcaChange={handleMarcaChange}
          handleModeloChange={handleModeloChange}
        />
        <IdentifiersFields formData={formData} setFormData={setFormData} owners={owners} />
        <UsageAndPhotoFields
          formData={formData}
          setFormData={setFormData}
          useTypes={useTypes}
          departments={departments}
          isFlotillaOrInternal={isFlotillaOrInternal}
        />
      </div>
    </div>
  );
}

export default IdentitySection;
