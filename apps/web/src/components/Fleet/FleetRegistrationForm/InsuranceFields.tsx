import React from 'react';
import { ShieldCheck, FileText, Calendar } from 'lucide-react';
import ArchonField from '../../ArchonField';
import ArchonSelect from '../../ArchonSelect';
import ArchonDatePicker from '../../ArchonDatePicker';
import { UseFleetFormReturn, CatalogOption, CreateFleetUnit } from '../../../types/fleet';

type SetFormData = UseFleetFormReturn['setFormData'];

type ComplianceStatusFieldProps = Pick<UseFleetFormReturn, 'complianceStatuses'> & {
  formData: Pick<CreateFleetUnit, 'complianceStatusId'>;
  setFormData: SetFormData;
};

function ComplianceStatusField({
  formData,
  setFormData,
  complianceStatuses,
}: ComplianceStatusFieldProps): React.JSX.Element {
  return (
    <ArchonField label="Estatus Botiquín PA" icon={ShieldCheck}>
      <ArchonSelect
        options={(complianceStatuses || []).map((s: CatalogOption) => ({
          value: s.id.toString(),
          label: s.label,
        }))}
        value={formData.complianceStatusId?.toString() || ''}
        onChange={(val: string): void =>
          setFormData((prev) => ({ ...prev, complianceStatusId: parseInt(val, 10) }))
        }
      />
    </ArchonField>
  );
}

type PolicyAndCompanyFieldsProps = Pick<UseFleetFormReturn, 'insuranceCompanies'> & {
  formData: Pick<CreateFleetUnit, 'insurancePolicyNumber' | 'insuranceCompanyId'>;
  setFormData: SetFormData;
};

function PolicyAndCompanyFields({
  formData,
  setFormData,
  insuranceCompanies,
}: PolicyAndCompanyFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ArchonField label="Póliza de Seguro" icon={FileText}>
        <input
          type="text"
          placeholder="Ej: POL-2024-XXXX"
          className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono"
          value={formData.insurancePolicyNumber || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
            setFormData((prev) => ({ ...prev, insurancePolicyNumber: e.target.value }))
          }
        />
      </ArchonField>
      <ArchonField label="Aseguradora" icon={ShieldCheck}>
        <ArchonSelect
          options={(insuranceCompanies || []).map((c: CatalogOption) => ({
            value: c.id.toString(),
            label: c.label,
          }))}
          value={formData.insuranceCompanyId?.toString() || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, insuranceCompanyId: parseInt(val, 10) }))
          }
        />
      </ArchonField>
    </div>
  );
}

type InsuranceExpiryAndCostFieldsProps = {
  formData: Pick<CreateFleetUnit, 'insuranceExpiryDate' | 'insuranceCost'>;
  setFormData: SetFormData;
};

function InsuranceExpiryAndCostFields({
  formData,
  setFormData,
}: InsuranceExpiryAndCostFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ArchonField label="Vigencia Seguro" icon={Calendar}>
        <ArchonDatePicker
          value={formData.insuranceExpiryDate || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, insuranceExpiryDate: val }))
          }
        />
      </ArchonField>
      <ArchonField label="Costo de Seguro" icon={ShieldCheck}>
        <div className="flex items-center w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus-within:border-b-[#f2b705] focus-within:bg-white focus-within:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] transition-all duration-300">
          <span className="text-[#0f2a44]/40 font-bold text-archon-lg">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="Ej: 850.00"
            className="flex-1 w-full bg-transparent px-2 py-0 border-none outline-none focus:ring-0 text-archon-lg font-mono text-emerald-600 font-bold placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal"
            value={
              formData.insuranceCost !== undefined && formData.insuranceCost !== null
                ? formData.insuranceCost
                : ''
            }
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
              const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
              setFormData((prev) => ({ ...prev, insuranceCost: val }));
            }}
          />
        </div>
      </ArchonField>
    </div>
  );
}

type InsuranceFieldsProps = Pick<
  UseFleetFormReturn,
  'complianceStatuses' | 'insuranceCompanies'
> & {
  formData: Pick<
    CreateFleetUnit,
    | 'complianceStatusId'
    | 'insurancePolicyNumber'
    | 'insuranceCompanyId'
    | 'insuranceExpiryDate'
    | 'insuranceCost'
  >;
  setFormData: SetFormData;
};

/** Botiquín PA + póliza/aseguradora + vigencia/costo de seguro (sub-bloque de CUMPLIMIENTO). */
export function InsuranceFields({
  formData,
  setFormData,
  complianceStatuses,
  insuranceCompanies,
}: InsuranceFieldsProps): React.JSX.Element {
  return (
    <>
      <ComplianceStatusField
        formData={formData}
        setFormData={setFormData}
        complianceStatuses={complianceStatuses}
      />
      <PolicyAndCompanyFields
        formData={formData}
        setFormData={setFormData}
        insuranceCompanies={insuranceCompanies}
      />
      <InsuranceExpiryAndCostFields formData={formData} setFormData={setFormData} />
    </>
  );
}

export default InsuranceFields;
