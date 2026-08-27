import React from 'react';
import { ShieldCheck, Zap, Activity, Calendar, Tag, Settings } from 'lucide-react';
import ArchonField from '../../ArchonField';
import ArchonSelect from '../../ArchonSelect';
import ArchonDatePicker from '../../ArchonDatePicker';
import { formatDate } from '../../../utils/dateUtils';
import { calcularVencimientoVerificacion } from '../../../utils/fleetCompliance';
import { UseFleetFormReturn, CatalogOption, CreateFleetUnit } from '../../../types/fleet';
import InsuranceFields from './InsuranceFields';

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

export type EnvironmentalPrediction = {
  hologramaSugerido: string;
  engomadoColor: string;
  mesesVerificacion: string;
} | null;

type SetFormData = UseFleetFormReturn['setFormData'];

type CirculationCardAndLegalFieldsProps = {
  formData: Pick<CreateFleetUnit, 'circulationCardNumber' | 'legalComplianceDate'>;
  setFormData: SetFormData;
};

function CirculationCardAndLegalFields({
  formData,
  setFormData,
}: CirculationCardAndLegalFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ArchonField label="Folio Tarjeta Circulación" icon={Tag}>
        <input
          type="text"
          placeholder="Ej: 123456789"
          className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono"
          value={formData.circulationCardNumber || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
            setFormData((prev) => ({ ...prev, circulationCardNumber: e.target.value }))
          }
        />
      </ArchonField>
      <ArchonField label="Cumplimiento Legal (Placas)" icon={Calendar}>
        <ArchonDatePicker
          value={formData.legalComplianceDate || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, legalComplianceDate: val }))
          }
        />
      </ArchonField>
    </div>
  );
}

type EnvironmentalAndMechanicalFieldsProps = {
  formData: Pick<
    CreateFleetUnit,
    'lastEnvironmentalVerification' | 'lastMechanicalVerification' | 'environmentalHologram'
  >;
  setFormData: SetFormData;
  vencimientoVerif: string | undefined;
};

function EnvironmentalAndMechanicalFields({
  formData,
  setFormData,
  vencimientoVerif,
}: EnvironmentalAndMechanicalFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ArchonField label="Verif. Ambiental" icon={Activity}>
        <ArchonDatePicker
          value={formData.lastEnvironmentalVerification || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({
              ...prev,
              lastEnvironmentalVerification: val,
              vencimientoVerificacion:
                calcularVencimientoVerificacion(val, prev.environmentalHologram) || undefined,
            }))
          }
        />
        {vencimientoVerif && (
          <div className="mt-2 p-2.5 rounded bg-amber-50 border border-amber-200/60 flex items-center gap-2 transition-all duration-300">
            <Calendar size={11} className="text-amber-600 shrink-0" />
            <p className="text-archon-sm font-black uppercase text-amber-700 tracking-wider">
              Vence: {formatDate(`${vencimientoVerif}T12:00:00`)}
            </p>
          </div>
        )}
      </ArchonField>
      <ArchonField label="Inspección Físico-Mecánica" icon={Settings}>
        <ArchonDatePicker
          value={formData.lastMechanicalVerification || ''}
          onChange={(val: string): void =>
            setFormData((prev) => ({ ...prev, lastMechanicalVerification: val }))
          }
        />
      </ArchonField>
    </div>
  );
}

type VerificationFieldsProps = {
  formData: Pick<
    CreateFleetUnit,
    | 'circulationCardNumber'
    | 'legalComplianceDate'
    | 'lastEnvironmentalVerification'
    | 'lastMechanicalVerification'
    | 'environmentalHologram'
  >;
  setFormData: SetFormData;
  vencimientoVerif: string | undefined;
};

function VerificationFields({
  formData,
  setFormData,
  vencimientoVerif,
}: VerificationFieldsProps): React.JSX.Element {
  return (
    <>
      <CirculationCardAndLegalFields formData={formData} setFormData={setFormData} />
      <EnvironmentalAndMechanicalFields
        formData={formData}
        setFormData={setFormData}
        vencimientoVerif={vencimientoVerif}
      />
    </>
  );
}

type EnvironmentalHologramFieldProps = Pick<UseFleetFormReturn, 'environmentalHolograms'> & {
  formData: Pick<CreateFleetUnit, 'environmentalHologram' | 'lastEnvironmentalVerification'>;
  setFormData: SetFormData;
  prediction: EnvironmentalPrediction;
};

const ENGOMADO_COLORS: Record<string, string> = {
  Amarillo: '#facc15',
  Rosa: '#ec4899',
  Rojo: '#ef4444',
  Verde: '#22c55e',
  Azul: '#3b82f6',
  Exento: '#10b981',
};

type HologramPredictionPreviewProps = {
  prediction: EnvironmentalPrediction;
  currentHologram: string | null | undefined;
  setFormData: SetFormData;
};

function HologramPredictionPreview({
  prediction,
  currentHologram,
  setFormData,
}: HologramPredictionPreviewProps): React.JSX.Element | null {
  if (!prediction) return null;
  return (
    <div className="mt-2.5 p-3 rounded bg-[#0f2a44]/5 border border-[#0f2a44]/10 flex items-center justify-between text-xs transition-all duration-300">
      <div className="flex items-center gap-2.5">
        <span
          className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shrink-0 shadow-sm"
          style={{ backgroundColor: ENGOMADO_COLORS[prediction.engomadoColor] || '#94a3b8' }}
        />
        <div>
          <p className="text-archon-base font-black uppercase text-[#0f2a44] tracking-wider">
            Calendario: {prediction.engomadoColor}
          </p>
          <p className="text-archon-sm text-[#0f2a44]/60 font-bold uppercase tracking-wider">
            Verificación: {prediction.mesesVerificacion}
          </p>
        </div>
      </div>
      {currentHologram !== prediction.hologramaSugerido && (
        <button
          type="button"
          onClick={(): void =>
            setFormData((prev) => ({
              ...prev,
              environmentalHologram: prediction.hologramaSugerido,
            }))
          }
          className="text-archon-sm font-black uppercase text-[#f2b705] hover:text-[#f2b705]/80 bg-transparent border-0 cursor-pointer p-0 underline tracking-wider"
        >
          Usar Sugerido (H-{prediction.hologramaSugerido})
        </button>
      )}
    </div>
  );
}

function EnvironmentalHologramField({
  formData,
  setFormData,
  environmentalHolograms,
  prediction,
}: EnvironmentalHologramFieldProps): React.JSX.Element {
  return (
    <ArchonField label="Holograma Ambiental" icon={ShieldCheck}>
      <ArchonSelect
        options={environmentalHolograms.map((t: CatalogOption) => ({
          value: t.code || '',
          label: t.label,
        }))}
        value={formData.environmentalHologram || ''}
        onChange={(val: string): void =>
          setFormData((prev) => ({
            ...prev,
            environmentalHologram: val,
            vencimientoVerificacion:
              calcularVencimientoVerificacion(prev.lastEnvironmentalVerification, val) || undefined,
          }))
        }
      />
      <HologramPredictionPreview
        prediction={prediction}
        currentHologram={formData.environmentalHologram}
        setFormData={setFormData}
      />
    </ArchonField>
  );
}

type FinancialFieldsProps = {
  formData: Pick<CreateFleetUnit, 'accountingAccount' | 'monthlyLeasePayment'>;
  setFormData: SetFormData;
  isFlotillaOrInternal: boolean;
};

function FinancialFields({
  formData,
  setFormData,
  isFlotillaOrInternal,
}: FinancialFieldsProps): React.JSX.Element {
  return (
    <div className="pt-4 border-t border-slate-100 space-y-6">
      <div className={flotillaGridClass(isFlotillaOrInternal)}>
        <FlotillaOnlyField show={isFlotillaOrInternal}>
          <ArchonField label="Cuenta Contable" icon={Tag}>
            <input
              type="text"
              placeholder="8019-XXX-XXX"
              className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono"
              value={formData.accountingAccount || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                setFormData((prev) => ({ ...prev, accountingAccount: e.target.value }))
              }
            />
          </ArchonField>
        </FlotillaOnlyField>
        <ArchonField label="Cuota Mensual / Arrend." icon={Zap}>
          <div className="flex items-center bg-pinnacle-navy/5 border border-pinnacle-navy/10 rounded-[4px] overflow-hidden focus-within:ring-2 focus-within:ring-pinnacle-navy/20 focus-within:border-pinnacle-navy/30 transition-all duration-300">
            <span className="px-4 py-3 text-pinnacle-navy/40 font-bold border-r border-pinnacle-navy/10 bg-pinnacle-navy/5 flex-shrink-0">
              $
            </span>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="Ej: 15500.50"
              className="flex-1 w-full bg-transparent px-4 py-3 outline-none border-none focus:ring-0 font-mono text-emerald-600 font-bold placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal"
              value={formData.monthlyLeasePayment ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                setFormData((prev) => ({
                  ...prev,
                  monthlyLeasePayment: e.target.value
                    ? Number.parseFloat(e.target.value)
                    : undefined,
                }))
              }
            />
          </div>
        </ArchonField>
      </div>
    </div>
  );
}

type ComplianceSectionProps = Pick<
  UseFleetFormReturn,
  | 'formData'
  | 'setFormData'
  | 'complianceStatuses'
  | 'insuranceCompanies'
  | 'environmentalHolograms'
> & {
  isFlotillaOrInternal: boolean;
  vencimientoVerif: string | undefined;
  prediction: EnvironmentalPrediction;
};

/** PANEL 2 — Cumplimiento (botiquín/seguro/tarjeta circulación/verificaciones/holograma/financiero). */
export function ComplianceSection({
  formData,
  setFormData,
  complianceStatuses,
  insuranceCompanies,
  environmentalHolograms,
  isFlotillaOrInternal,
  vencimientoVerif,
  prediction,
}: ComplianceSectionProps): React.JSX.Element {
  return (
    <div className="card-archon-sovereign bg-white p-10 space-y-8 relative z-20 [--card-accent:#0f2a44]">
      <div className="card-sovereign-header">
        <ShieldCheck size={22} className="text-[var(--card-accent)]" />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">CUMPLIMIENTO</h3>
      </div>

      <div className="space-y-6">
        <InsuranceFields
          formData={formData}
          setFormData={setFormData}
          complianceStatuses={complianceStatuses}
          insuranceCompanies={insuranceCompanies}
        />
        <VerificationFields
          formData={formData}
          setFormData={setFormData}
          vencimientoVerif={vencimientoVerif}
        />
        <EnvironmentalHologramField
          formData={formData}
          setFormData={setFormData}
          environmentalHolograms={environmentalHolograms}
          prediction={prediction}
        />
        <FinancialFields
          formData={formData}
          setFormData={setFormData}
          isFlotillaOrInternal={isFlotillaOrInternal}
        />
      </div>
    </div>
  );
}

export default ComplianceSection;
