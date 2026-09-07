import React from 'react';
import { MapPin, Home, Hash, LucideIcon } from 'lucide-react';
import ArchonSelect from '../../ArchonSelect';
import ArchonGeoSelector from './ArchonGeoSelector';
import { RouteAssignmentPanelProps } from './types';

import { CatalogOption } from '../../../types/fleet';

interface RouteMissionPanelProps extends RouteAssignmentPanelProps {
  readonly origins: CatalogOption[];
}

/** Encabezado de fase II: misión y destino (FC163 F2B5). */
function MissionPanelHeader(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-[#f2b705] p-2 rounded-[4px]">
        <MapPin size={20} className="text-[#0f2a44]" />
      </div>
      <div>
        <span className="text-archon-base font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-50">
          Fase II
        </span>
        <h3 className="text-archon-xl font-black uppercase tracking-tight text-[#0f2a44]">
          Misión y Destino
        </h3>
      </div>
    </div>
  );
}

interface OriginFieldProps {
  readonly origins: CatalogOption[];
  readonly origin: string;
  readonly onOriginChange: (v: string) => void;
}

/** Selector de origen, insertado como originNode del ArchonGeoSelector (FC163 F2B5). */
function OriginField({ origins, origin, onOriginChange }: OriginFieldProps): React.JSX.Element {
  return (
    <>
      <span className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
        Origen
      </span>
      <ArchonSelect
        options={origins.map((o) => ({ value: o.label, label: o.label }))}
        value={origin}
        onChange={onOriginChange}
        icon={MapPin}
      />
    </>
  );
}

interface AddressInputFieldProps {
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly icon: LucideIcon;
  readonly colSpanClassName: string;
}

/** Campo de dirección reusado (Calle / Número / Num. Int.), input+icono+label asociado (FC163 F2B5). */
function AddressInputField({
  id,
  label,
  placeholder: fieldPlaceholder,
  value,
  onChange,
  icon: Icon,
  colSpanClassName,
}: AddressInputFieldProps): React.JSX.Element {
  return (
    <div className={`${colSpanClassName} space-y-1.5`}>
      <label
        htmlFor={id}
        className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          placeholder={fieldPlaceholder}
          value={value}
          onChange={(e): void => onChange(e.target.value)}
          className="peer w-full h-11 bg-[#0f2a44]/5 border-b-2 border-[#0f2a44]/10 focus:border-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pl-10 text-archon-lg font-bold text-[#0f2a44] placeholder:text-[#0f2a44]/30 outline-none transition-all duration-300 rounded-[4px]"
        />
        <Icon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30 peer-focus:text-[#f2b705] transition-colors pointer-events-none"
        />
      </div>
    </div>
  );
}

interface AddressDetailFieldsProps {
  readonly calle: string;
  readonly numero: string;
  readonly numeroInterior: string;
  readonly onCalleChange: (v: string) => void;
  readonly onNumeroChange: (v: string) => void;
  readonly onNumeroInteriorChange: (v: string) => void;
}

/** Campos de calle, número y número interior del destino (FC163 F2B5). */
function AddressDetailFields({
  calle,
  numero,
  numeroInterior,
  onCalleChange,
  onNumeroChange,
  onNumeroInteriorChange,
}: AddressDetailFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-4 gap-4 pt-2">
      <AddressInputField
        id="route-mission-calle"
        label="Calle"
        placeholder="Calle o Avenida..."
        value={calle}
        onChange={onCalleChange}
        icon={Home}
        colSpanClassName="col-span-2"
      />
      <AddressInputField
        id="route-mission-numero"
        label="Número"
        placeholder="Ext."
        value={numero}
        onChange={onNumeroChange}
        icon={Hash}
        colSpanClassName="col-span-1"
      />
      <AddressInputField
        id="route-mission-numero-interior"
        label="Num. Int."
        placeholder="Opcional"
        value={numeroInterior}
        onChange={onNumeroInteriorChange}
        icon={Hash}
        colSpanClassName="col-span-1"
      />
    </div>
  );
}

/**
 * 🔱 Archon Panel: Route Mission (Fase II)
 * Handles destination, origin and mission description.
 */
const RouteMissionPanel: React.FC<RouteMissionPanelProps> = ({ formData, updateForm, origins }) => (
  <div className="space-y-4">
    <MissionPanelHeader />

    <ArchonGeoSelector
      value={formData.destinationNeighborhoodId}
      onChange={(neighborhoodId: number | undefined, destStr: string): void => {
        updateForm({
          destinationNeighborhoodId: neighborhoodId,
          destination: destStr,
        });
      }}
      originNode={
        <OriginField
          origins={origins}
          origin={formData.origin}
          onOriginChange={(val): void => updateForm({ origin: val })}
        />
      }
    />

    {/* Dirección de Destino Detallada (Fila 3) */}
    <AddressDetailFields
      calle={formData.calle || ''}
      numero={formData.numero || ''}
      numeroInterior={formData.numeroInterior || ''}
      onCalleChange={(v): void => updateForm({ calle: v })}
      onNumeroChange={(v): void => updateForm({ numero: v })}
      onNumeroInteriorChange={(v): void => updateForm({ numeroInterior: v })}
    />
  </div>
);

export default React.memo(RouteMissionPanel);
