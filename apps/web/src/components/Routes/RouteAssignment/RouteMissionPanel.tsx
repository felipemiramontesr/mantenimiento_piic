import React from 'react';
import { MapPin, Home, Hash, LucideIcon } from 'lucide-react';
import ArchonField from '../../ArchonField';
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
    <div className="card-sovereign-header">
      <MapPin size={22} className="text-[var(--card-accent)]" />
      <h3 className="card-sovereign-title text-archon-xl opacity-100">
        Fase II — Misión y Destino
      </h3>
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
    <ArchonField label="Origen" icon={MapPin}>
      <ArchonSelect
        options={origins.map((o) => ({ value: o.label, label: o.label }))}
        value={origin}
        onChange={onOriginChange}
      />
    </ArchonField>
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
  icon,
  colSpanClassName,
}: AddressInputFieldProps): React.JSX.Element {
  return (
    <ArchonField label={label} icon={icon} className={colSpanClassName}>
      <input
        id={id}
        type="text"
        placeholder={fieldPlaceholder}
        value={value}
        onChange={(e): void => onChange(e.target.value)}
        className="archon-input"
      />
    </ArchonField>
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
