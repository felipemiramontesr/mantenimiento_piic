import React, { useState, useCallback, useMemo } from 'react';
import {
  CreateFleetUnit,
  AssetType,
  UseFleetFormReturn,
} from '../types/fleet';
import getInitialFleetForm from '../utils/fleetUtils';
import api from '../api/client';
import {
  MARCAS_VEHICULO,
  MARCAS_MAQUINARIA,
  MARCAS_HERRAMIENTA,
} from '../constants/fleetConstants';

/**
 * 🔱 Archon Sovereign Hook: useFleetForm
 * Implementation: Silicon Valley Standard (SRP/DIP)
 * Purpose: Encapsulates all intelligence related to fleet asset registration.
 */

// interface UseFleetFormReturn removed as it is now global

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

  // 📐 Catalog Logic (Open/Closed compliant)
  const assetCatalogs: Record<AssetType, Record<string, string[]>> = useMemo(
    () => ({
      Vehiculo: MARCAS_VEHICULO,
      Maquinaria: MARCAS_MAQUINARIA,
      Herramienta: MARCAS_HERRAMIENTA,
    }),
    [],
  );

  const availableMarcas = useMemo(
    () => Object.keys(assetCatalogs[formData.assetType]),
    [formData.assetType, assetCatalogs],
  );

  const availableModelos = useMemo(
    () => assetCatalogs[formData.assetType][formData.marca] ?? [],
    [formData.assetType, formData.marca, assetCatalogs],
  );

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
    onSuccess?: () => Promise<void>,
  ): Promise<void> => {
    e.preventDefault();
    if (isSubmitting) return;

    // Strict validation Gate
    if (
      !formData.marca ||
      !formData.modelo ||
      !formData.tag ||
      !formData.departamento ||
      !formData.uso
    ) {
      throw new Error('Por favor, completa todos los campos obligatorios (*)');
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        vigenciaSeguro: formData.vigenciaSeguro || null,
        vencimientoVerificacion: formData.vencimientoVerificacion || null,
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
        serverError ||
        (error instanceof Error ? error.message : 'Error crítico de transmisión');
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
    setFormData,
    setRegistrationSuccess,
    handleAssetTypeChange,
    handleMarcaChange,
    handleSubmit,
    resetForm,
  };
};

export default useFleetForm;
