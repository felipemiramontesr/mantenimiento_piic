import api from '../../../api/client';
import { AddressValue, EMPTY_ADDRESS } from '../../Common/ArchonAddressField';

export interface ProfileApiData {
  rfc: string | null;
  razonSocial: string | null;
  telefono: string | null;
  especialidades: string[] | null;
  calle: string | null;
  numeroExt: string | null;
  numeroInt: string | null;
  neighborhoodId: number | null;
  ownerType: string;
}

export interface ProfileForm {
  rfc: string;
  razonSocial: string;
  telefono: string;
  especialidades: string[];
}

export const EMPTY_FORM: ProfileForm = {
  rfc: '',
  razonSocial: '',
  telefono: '',
  especialidades: [],
};

/** Título del panel según el tipo de owner (FC163 F2B3, split de OwnerProfilePanel). */
export function getProfileTitle(ownerType: string | null): string {
  if (ownerType === 'FLOTILLA') return 'Perfil Empresarial';
  if (ownerType === 'CENTER') return 'Perfil Centro Especializado';
  return 'Perfil Personal';
}

/** Hidrata el AddressValue desde el neighborhoodId guardado (FC163 F2B3, split de OwnerProfilePanel). */
export async function hydrateAddress(data: ProfileApiData): Promise<AddressValue> {
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
