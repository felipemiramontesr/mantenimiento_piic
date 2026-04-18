import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { CreateFleetUnit, AssetType, UseFleetFormReturn } from '../types/fleet';
import getInitialFleetForm from '../utils/fleetUtils';
import api from '../api/client';

/**
 * 🔱 Archon Sovereign Hook: useFleetForm (v.18.0.0)
 * Logic: Dynamic Hierarchical Catalog Integration.
 * Architecture: Silicon Valley Standard (SRP/DIP)
 */

interface CatalogOption {
  id: number;
  label: string;
  code: string;
}

interface AxiosErrorResponse {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const useFleetForm = (): UseFleetFormReturn => {
  const [formData, setFormData] = useState<CreateFleetUnit>(getInitialFleetForm());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);

  // 📐 Dynamic Catalog State
  const [marcas, setMarcas] = useState<CatalogOption[]>([]);
  const [modelos, setModelos] = useState<CatalogOption[]>([]);
  const [freqTime, setFreqTime] = useState<CatalogOption[]>([]);
  const [freqUsage, setFreqUsage] = useState<CatalogOption[]>([]);

  // Asset Type Mapping to Database IDs (Based on 007 seed)
  const assetTypeMap: Record<AssetType, number> = {
    Vehiculo: 1,
    Maquinaria: 2,
    Herramienta: 3,
  };

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
      try {
        const parentId = assetTypeMap[formData.assetType];
        const res = await api.get(`/catalogs/BRAND?parentId=${parentId}`);
        if (isMountedRef.current) {
          setMarcas(res.data);
        }
      } catch (error) {
        if (isMountedRef.current) {
          // eslint-disable-next-line no-console
          console.error('Failed to fetch Brands', error);
        }
      }
    };
    fetchBrands();
  }, [formData.assetType]);

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
          if (isMountedRef.current) {
            setModelos(res.data);
          }
        }
      } catch (error) {
        if (isMountedRef.current) {
          // eslint-disable-next-line no-console
          console.error('Failed to fetch Models', error);
        }
      }
    };
    fetchModels();
  }, [formData.marca, marcas]);

  // 🔄 Fetch Frequencies only once
  useEffect(() => {
    const fetchFrequencies = async (): Promise<void> => {
      try {
        const [timeRes, usageRes] = await Promise.all([
          api.get('/catalogs/FREQ_TIME'),
          api.get('/catalogs/FREQ_USAGE'),
        ]);
        if (isMountedRef.current) {
          setFreqTime(timeRes.data);
          setFreqUsage(usageRes.data);
        }
      } catch (error) {
        if (isMountedRef.current) {
          // eslint-disable-next-line no-console
          console.error('Failed to fetch frequencies', error);
        }
      }
    };
    fetchFrequencies();
  }, []);

  const availableMarcas = useMemo(() => marcas.map((m) => m.label), [marcas]);
  const availableModelos = useMemo(() => modelos.map((m) => m.label), [modelos]);

  const handleAssetTypeChange = useCallback((type: AssetType): void => {
    setFormData((prev) => ({
      ...prev,
      assetType: type,
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
  }, []);

  /**
   * 🛡️ Sovereign Validation & Transmission
   */
  const handleSubmit = async (
    e: React.FormEvent,
    onSuccess?: () => Promise<void>
  ): Promise<void> => {
    e.preventDefault();
    if (isSubmitting) return;

    if (
      !formData.marca ||
      !formData.modelo ||
      !formData.id ||
      !formData.departamento ||
      !formData.uso
    ) {
      throw new Error('Por favor, completa todos los campos obligatorios (*)');
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
    } catch (error: unknown) {
      const serverError = (error as AxiosErrorResponse)?.response?.data?.error;
      const message =
        serverError || (error instanceof Error ? error.message : 'Error crítico de transmisión');
      throw new Error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    isSubmitting,
    registrationSuccess,
    availableMarcas,
    availableModelos,
    freqTime: freqTime.map((f) => f.label),
    freqUsage: freqUsage.map((f) => ({ id: f.id, label: f.label })),
    setFormData,
    setRegistrationSuccess,
    handleAssetTypeChange,
    handleMarcaChange,
    handleSubmit,
    resetForm,
  };
};

export default useFleetForm;
