import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { CreateFleetUnit, UseFleetFormReturn, CatalogOption } from '../types/fleet';
import getInitialFleetForm from '../utils/fleetUtils';
import api from '../api/client';

/**
 * 🔱 Archon Sovereign Hook: useFleetForm (v.18.0.0)
 * Logic: Dynamic Hierarchical Catalog Integration.
 * Architecture: Silicon Valley Standard (SRP/DIP)
 */

interface AxiosErrorResponse {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const useFleetForm = (): UseFleetFormReturn => {
  const [formData, setFormData] = useState<CreateFleetUnit>(getInitialFleetForm());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);

  const resetError = useCallback(() => setError(null), []);

  const [assetTypes, setAssetTypes] = useState<CatalogOption[]>([]);
  const [fuelTypes, setFuelTypes] = useState<CatalogOption[]>([
    { id: 11, label: 'Diesel' },
    { id: 12, label: 'Gasolina' },
    { id: 13, label: 'Híbrido' },
    { id: 14, label: 'Eléctrico' },
  ]);
  const [driveTypes, setDriveTypes] = useState<CatalogOption[]>([
    { id: 20, label: '4x4 (Total)' },
    { id: 21, label: '4x2 (RWD)' },
    { id: 22, label: '4x2 (FWD)' },
    { id: 23, label: 'AWD (Integral)' },
  ]);
  const [transmissionTypes, setTransmissionTypes] = useState<CatalogOption[]>([
    { id: 31, label: 'Manual (5 vel)' },
    { id: 32, label: 'Manual (6 vel)' },
    { id: 33, label: 'Automática' },
    { id: 34, label: 'CVT' },
  ]);
  const [marcas, setMarcas] = useState<CatalogOption[]>([]);
  const [modelos, setModelos] = useState<CatalogOption[]>([]);
  const [freqTime, setFreqTime] = useState<CatalogOption[]>([
    { id: 41, label: 'Mensual' },
    { id: 42, label: 'Trimestral' },
    { id: 43, label: 'Semestral' },
    { id: 44, label: 'Anual' },
  ]);
  const [freqUsage, setFreqUsage] = useState<CatalogOption[]>([
    { id: 51, label: 'Kilometraje (Motor)' },
    { id: 52, label: 'Horas (Maquinaria)' },
    { id: 53, label: 'Horas (Generador)' },
  ]);

  const isMountedRef = React.useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return (): void => {
      isMountedRef.current = false;
    };
  }, []);

  // 🔄 Fetch Brands on Asset Type Change
  useEffect(() => {
    const fetchBrands = async (): Promise<void> => {
      if (!formData.assetTypeId) return;
      try {
        const res = await api.get(`/catalogs/BRAND?parentId=${formData.assetTypeId}`);
        if (isMountedRef.current) {
          setMarcas(res.data);
        }
      } catch (err) {
        if (isMountedRef.current) {
          // eslint-disable-next-line no-console
          console.error('Failed to fetch Brands', err);
        }
      }
    };
    fetchBrands();
  }, [formData.assetTypeId]);

  // 🔄 Fetch Models on Brand Change
  useEffect(() => {
    const fetchModels = async (): Promise<void> => {
      if (!formData.marca) {
        if (isMountedRef.current) {
          setModelos([]);
        }
        return;
      }
      try {
        const selectedBrand = marcas.find((m) => m.label === formData.marca);
        if (selectedBrand) {
          const res = await api.get(`/catalogs/MODEL?parentId=${selectedBrand.id}`);
          if (isMountedRef.current && res.data?.length) {
            setModelos(res.data);
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          // eslint-disable-next-line no-console
          console.error('Failed to fetch Models', err);
        }
      }
    };
    fetchModels();
  }, [formData.marca, marcas]);

  // 🔄 Fetch All Root Catalogs on Mount
  useEffect(() => {
    const fetchRootCatalogs = async (): Promise<void> => {
      try {
        const [timeRes, usageRes, fuelRes, driveRes, transRes, assetRes] = await Promise.all([
          api.get('/catalogs/FREQ_TIME'),
          api.get('/catalogs/FREQ_USAGE'),
          api.get('/catalogs/FUEL'),
          api.get('/catalogs/DRIVE_TYPE'),
          api.get('/catalogs/TRANSMISSION'),
          api.get('/catalogs/ASSET_TYPE'),
        ]);
        if (isMountedRef.current) {
          if (timeRes.data?.length) setFreqTime(timeRes.data);
          if (usageRes.data?.length) setFreqUsage(usageRes.data);
          if (fuelRes.data?.length) setFuelTypes(fuelRes.data);
          if (driveRes.data?.length) setDriveTypes(driveRes.data);
          if (transRes.data?.length) setTransmissionTypes(transRes.data);
          if (assetRes.data?.length) setAssetTypes(assetRes.data);
        }
      } catch (err) {
        if (isMountedRef.current) {
          // Fallback handled by initial mock state
          // eslint-disable-next-line no-console
          console.warn('Backend catalogs unavailable. Using frontend mocks.', err);
        }
      }
    };
    fetchRootCatalogs();
  }, []);

  const availableMarcas = useMemo(() => marcas.map((m) => m.label), [marcas]);
  const availableModelos = useMemo(() => modelos.map((m) => m.label), [modelos]);

  const handleAssetTypeChange = useCallback((id: number): void => {
    setFormData((prev) => ({
      ...prev,
      assetTypeId: id,
      marca: '',
      modelo: '',
    }));
  }, []);

  const handleMarcaChange = useCallback((marca: string): void => {
    setFormData((prev) => ({
      ...prev,
      marca,
      modelo: '',
    }));
  }, []);

  const resetForm = useCallback((): void => {
    setFormData(getInitialFleetForm());
    setRegistrationSuccess(false);
    setError(null);
  }, []);

  /**
   * 🛡️ Sovereign Validation & Transmission
   */
  const handleSubmit = async (
    e: React.FormEvent,
    onSuccess?: () => Promise<void>
  ): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (isSubmitting) return;

    if (
      !formData.marca ||
      !formData.modelo ||
      !formData.id ||
      !formData.departamento ||
      !formData.uso
    ) {
      const msg = 'Por favor, completa todos los campos obligatorios (*)';
      setError(msg);
      throw new Error(msg);
    }

    setIsSubmitting(true);
    try {
      // Resolve IDs for the Intelligence Core
      const selectedTimeFreq = freqTime.find((f) => f.label === formData.maintenanceFrequency);

      const payload = {
        ...formData,
        vigenciaSeguro: formData.vigenciaSeguro || null,
        vencimientoVerificacion: formData.vencimientoVerificacion || null,
        maintenanceTimeFreqId: selectedTimeFreq?.id || null,
        maintenanceUsageFreqId: formData.maintenanceUsageFreqId || null,
      };

      const response = await api.post('/fleet', payload);

      if (response.data.success) {
        if (onSuccess) await onSuccess();
        setRegistrationSuccess(true);
      } else {
        throw new Error(response.data.error || 'Operación fallida en el servidor');
      }
    } catch (err: unknown) {
      const serverError = (err as AxiosErrorResponse)?.response?.data?.error;
      const message =
        serverError || (err instanceof Error ? err.message : 'Error crítico de transmisión');
      setError(message);
      throw new Error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    error,
    resetError,
    isSubmitting,
    registrationSuccess,
    availableMarcas,
    availableModelos,
    assetTypes,
    fuelTypes,
    driveTypes,
    transmissionTypes,
    freqTime: freqTime.map((f) => f.label),
    freqUsage: freqUsage.map((f) => ({ id: f.id, label: f.label })),
    setFormData,
    setError,
    setRegistrationSuccess,
    handleAssetTypeChange,
    handleMarcaChange,
    handleSubmit,
    resetForm,
  };
};

export default useFleetForm;
