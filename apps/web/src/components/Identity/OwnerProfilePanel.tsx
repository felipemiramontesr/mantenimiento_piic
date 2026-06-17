import React, { useState, useEffect } from 'react';
import { FileText, Phone, Building2, Star, Save, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import ArchonField from '../ArchonField';
import ArchonAddressField, { AddressValue, EMPTY_ADDRESS } from '../Common/ArchonAddressField';

interface ProfileApiData {
  rfc: string | null;
  razonSocial: string | null;
  telefono: string | null;
  especialidades: string | null;
  calle: string | null;
  numeroExt: string | null;
  numeroInt: string | null;
  neighborhoodId: number | null;
  ownerType: string;
}

interface ProfileForm {
  rfc: string;
  razonSocial: string;
  telefono: string;
  especialidades: string;
}

const EMPTY_FORM: ProfileForm = {
  rfc: '',
  razonSocial: '',
  telefono: '',
  especialidades: '',
};

function getProfileTitle(ownerType: string | null): string {
  if (ownerType === 'FLOTILLA') return 'Perfil Empresarial';
  if (ownerType === 'CENTER') return 'Perfil Centro Especializado';
  return 'Perfil Personal';
}

async function hydrateAddress(data: ProfileApiData): Promise<AddressValue> {
  if (!data.neighborhoodId) return EMPTY_ADDRESS;
  try {
    const res = await api.get<{
      success: boolean;
      data: { stateId: number; municipalityId: number; postalCode: string };
    }>(`/geolocation/neighborhoods/${data.neighborhoodId}`);
    const geo = res.data?.data;
    if (!geo) return EMPTY_ADDRESS;
    return {
      stateId: String(geo.stateId),
      municipalityId: String(geo.municipalityId),
      neighborhoodId: String(data.neighborhoodId),
      calle: data.calle || '',
      numeroExt: data.numeroExt || '',
      numeroInt: data.numeroInt || '',
      postalCode: geo.postalCode || '',
    };
  } catch {
    return EMPTY_ADDRESS;
  }
}

const OwnerProfilePanel: React.FC = (): React.JSX.Element => {
  const { currentUser, ownerType } = useAuth();
  const roleId = currentUser?.roleId ?? 0;

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [addressValue, setAddressValue] = useState<AddressValue>(EMPTY_ADDRESS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async (): Promise<void> => {
      try {
        const res = await api.get<{ success: boolean; data: ProfileApiData }>('/owners/me/profile');
        const d = res.data?.data;
        if (!d || cancelled) return;
        setForm({
          rfc: d.rfc || '',
          razonSocial: d.razonSocial || '',
          telefono: d.telefono || '',
          especialidades: d.especialidades || '',
        });
        const addr = await hydrateAddress(d);
        if (!cancelled) setAddressValue(addr);
      } catch {
        // profile not found or network error — form stays empty
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadProfile();
    return (): void => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const payload: Record<string, unknown> = {
        rfc: form.rfc || null,
        razonSocial: form.razonSocial || null,
        telefono: form.telefono || null,
      };
      if (roleId === 3) payload.especialidades = form.especialidades || null;
      if (addressValue.neighborhoodId) {
        payload.neighborhoodId = parseInt(addressValue.neighborhoodId, 10);
        if (addressValue.calle) payload.calle = addressValue.calle;
        if (addressValue.numeroExt) payload.numeroExt = addressValue.numeroExt;
        if (addressValue.numeroInt) payload.numeroInt = addressValue.numeroInt;
      }
      await api.patch('/owners/me/profile', payload);
      setSuccess(true);
    } catch {
      setError('No se pudo guardar el perfil. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div data-testid="owner-profile-loading" className="flex items-center justify-center py-12">
        <span className="text-archon-muted text-sm">Cargando perfil...</span>
      </div>
    );
  }

  const rfcLabel = roleId === 4 ? 'RFC (Opcional)' : 'RFC';
  const razonSocialLabel = roleId === 4 ? 'Nombre Legal' : 'Razón Social';
  const profileTitle = getProfileTitle(ownerType);

  return (
    <div data-testid="owner-profile-panel" className="archon-card space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-archon-border">
        <Building2 className="w-5 h-5 text-archon-accent" />
        <h3 className="text-archon-primary font-semibold text-sm">{profileTitle}</h3>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ArchonField label={rfcLabel} icon={FileText}>
          <input
            type="text"
            className="archon-input"
            data-testid="owner-rfc-input"
            placeholder="RFC"
            value={form.rfc}
            onChange={(e): void => setForm((f) => ({ ...f, rfc: e.target.value }))}
          />
        </ArchonField>
        <ArchonField label={razonSocialLabel} icon={Building2}>
          <input
            type="text"
            className="archon-input"
            data-testid="owner-razon-social-input"
            placeholder={razonSocialLabel}
            value={form.razonSocial}
            onChange={(e): void => setForm((f) => ({ ...f, razonSocial: e.target.value }))}
          />
        </ArchonField>
      </div>

      <ArchonField label="Teléfono" icon={Phone}>
        <input
          type="text"
          className="archon-input"
          data-testid="owner-telefono-input"
          placeholder="10 dígitos"
          value={form.telefono}
          onChange={(e): void => setForm((f) => ({ ...f, telefono: e.target.value }))}
        />
      </ArchonField>

      {roleId === 3 && (
        <ArchonField label="Especialidades" icon={Star}>
          <input
            type="text"
            className="archon-input"
            data-testid="owner-especialidades-input"
            placeholder="Ej. Motores, Suspensión"
            value={form.especialidades}
            onChange={(e): void => setForm((f) => ({ ...f, especialidades: e.target.value }))}
          />
        </ArchonField>
      )}

      <ArchonAddressField value={addressValue} onChange={setAddressValue} />

      {success && (
        <div
          data-testid="owner-profile-success"
          className="flex items-center gap-2 text-green-400 text-sm"
        >
          <CheckCircle className="w-4 h-4" />
          Perfil actualizado correctamente.
        </div>
      )}
      {error && (
        <p data-testid="owner-profile-error" className="text-red-400 text-sm">
          {error}
        </p>
      )}

      <div className="flex justify-end pt-4">
        <button
          type="button"
          data-testid="owner-profile-save"
          className="archon-btn-primary flex items-center gap-2"
          onClick={handleSave}
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? 'Guardando...' : 'Guardar Perfil'}
        </button>
      </div>
    </div>
  );
};

export default OwnerProfilePanel;
