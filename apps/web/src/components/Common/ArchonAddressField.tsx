import React, { useState, useEffect } from 'react';
import { MapPin, Contact } from 'lucide-react';
import api from '../../api/client';
import ArchonField from '../ArchonField';
import ArchonSelect from '../ArchonSelect';

export interface AddressValue {
  stateId: string;
  municipalityId: string;
  neighborhoodId: string;
  calle: string;
  numeroExt: string;
  numeroInt: string;
  postalCode: string;
}

export const EMPTY_ADDRESS: AddressValue = {
  stateId: '',
  municipalityId: '',
  neighborhoodId: '',
  calle: '',
  numeroExt: '',
  numeroInt: '',
  postalCode: '',
};

interface GeoItem {
  id: number;
  name: string;
}

interface ArchonAddressFieldProps {
  value: AddressValue;
  onChange: (val: AddressValue) => void;
}

const ArchonAddressField: React.FC<ArchonAddressFieldProps> = ({ value, onChange }) => {
  const [states, setStates] = useState<GeoItem[]>([]);
  const [municipalities, setMunicipalities] = useState<GeoItem[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<GeoItem[]>([]);

  useEffect(() => {
    api
      .get<{ success: boolean; data: GeoItem[] }>('/geolocation/states')
      .then((res) => setStates(res.data?.data || []))
      .catch(() => setStates([]));
  }, []);

  useEffect(() => {
    if (!value.stateId) {
      setMunicipalities([]);
      return;
    }
    api
      .get<{ success: boolean; data: GeoItem[] }>(
        `/geolocation/states/${value.stateId}/municipalities`
      )
      .then((res) => setMunicipalities(res.data?.data || []))
      .catch(() => setMunicipalities([]));
  }, [value.stateId]);

  useEffect(() => {
    if (!value.municipalityId) {
      setNeighborhoods([]);
      return;
    }
    api
      .get<{ success: boolean; data: GeoItem[] }>(
        `/geolocation/municipalities/${value.municipalityId}/neighborhoods`
      )
      .then((res) => setNeighborhoods(res.data?.data || []))
      .catch(() => setNeighborhoods([]));
  }, [value.municipalityId]);

  const handleStateChange = (stateId: string): void => {
    onChange({ ...value, stateId, municipalityId: '', neighborhoodId: '', postalCode: '' });
  };

  const handleMunicipalityChange = (municipalityId: string): void => {
    onChange({ ...value, municipalityId, neighborhoodId: '', postalCode: '' });
  };

  const handleNeighborhoodChange = (neighborhoodId: string): void => {
    const next: AddressValue = { ...value, neighborhoodId, postalCode: '' };
    onChange(next);
    if (!neighborhoodId) return;
    api
      .get<{ success: boolean; data: { postalCode: string } }>(
        `/geolocation/neighborhoods/${neighborhoodId}`
      )
      .then((res) => {
        const pc = res.data?.data?.postalCode || '';
        onChange({ ...next, postalCode: pc });
      })
      .catch((): void => undefined);
  };

  return (
    <div data-testid="archon-address-field" className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <ArchonField label="Estado" icon={MapPin}>
          <div data-testid="address-state-select">
            <ArchonSelect
              options={states.map((s) => ({ value: s.id.toString(), label: s.name }))}
              value={value.stateId}
              onChange={handleStateChange}
            />
          </div>
        </ArchonField>
        <ArchonField label="Municipio" icon={MapPin}>
          <div data-testid="address-municipality-select">
            <ArchonSelect
              options={municipalities.map((m) => ({ value: m.id.toString(), label: m.name }))}
              value={value.municipalityId}
              onChange={handleMunicipalityChange}
            />
          </div>
        </ArchonField>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <ArchonField label="Colonia" icon={MapPin}>
          <div data-testid="address-neighborhood-select">
            <ArchonSelect
              options={neighborhoods.map((n) => ({ value: n.id.toString(), label: n.name }))}
              value={value.neighborhoodId}
              onChange={handleNeighborhoodChange}
            />
          </div>
        </ArchonField>
        <ArchonField label="Código Postal" icon={MapPin}>
          <input
            type="text"
            className="archon-input"
            data-testid="address-postal-code"
            readOnly
            value={value.postalCode}
            placeholder="Auto-completado"
          />
        </ArchonField>
      </div>
      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-2">
          <ArchonField label="Calle" icon={Contact}>
            <input
              type="text"
              className="archon-input"
              data-testid="address-calle"
              placeholder="Nombre de la calle"
              value={value.calle}
              onChange={(e): void => onChange({ ...value, calle: e.target.value })}
            />
          </ArchonField>
        </div>
        <ArchonField label="No. Ext." icon={MapPin}>
          <input
            type="text"
            className="archon-input"
            data-testid="address-numero-ext"
            placeholder="42"
            value={value.numeroExt}
            onChange={(e): void => onChange({ ...value, numeroExt: e.target.value })}
          />
        </ArchonField>
        <ArchonField label="No. Int." icon={MapPin}>
          <input
            type="text"
            className="archon-input"
            data-testid="address-numero-int"
            placeholder="Opcional"
            value={value.numeroInt}
            onChange={(e): void => onChange({ ...value, numeroInt: e.target.value })}
          />
        </ArchonField>
      </div>
    </div>
  );
};

export default ArchonAddressField;
