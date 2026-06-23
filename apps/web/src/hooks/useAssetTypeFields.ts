import { useState, useEffect } from 'react';
import api from '../api/client';

export type FieldVisibility = Record<string, boolean>;

export const DEFAULT_FIELD_VISIBILITY: FieldVisibility = {
  placa: true,
  circulationCardNumber: true,
  numeroSerie: true,
  insurancePolicyNumber: true,
  insuranceExpiryDate: true,
  vencimientoVerificacion: true,
  warrantyExpiry: true,
};

type AssetTypeEntry = {
  id: number;
  code: string;
  label: string;
  icon_name: string;
  fields: FieldVisibility;
};

type UseAssetTypeFieldsResult = {
  fields: FieldVisibility;
  loading: boolean;
};

export function useAssetTypeFields(
  assetTypeId: number | null | undefined
): UseAssetTypeFieldsResult {
  const [fields, setFields] = useState<FieldVisibility>(DEFAULT_FIELD_VISIBILITY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<{ success: boolean; data: AssetTypeEntry[] }>('/catalogs/asset-types')
      .then((res) => {
        if (!cancelled) {
          const entry = res.data.data.find((t) => t.id === assetTypeId);
          setFields(entry?.fields ?? DEFAULT_FIELD_VISIBILITY);
        }
      })
      .catch(() => {
        // fallback=VEHICLE: degrade gracefully — show all fields
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return (): void => {
      cancelled = true;
    };
  }, [assetTypeId]);

  return { fields, loading };
}
