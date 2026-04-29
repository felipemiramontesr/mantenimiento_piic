import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AxiosResponse } from 'axios';
import { CatalogOption } from '../types/fleet';
import { CreateServiceOrder, UseServiceOrderFormReturn } from '../types/serviceOrder';
import api from '../api/client';

const extractCatalogData = (
  res: AxiosResponse<{ data?: CatalogOption[] } | CatalogOption[]>
): CatalogOption[] => {
  const { data } = res;
  const rawData = (data as { data?: CatalogOption[] })?.data || (data as CatalogOption[]) || [];
  return Array.isArray(rawData) ? rawData : [];
};

const INITIAL_FORM_STATE: CreateServiceOrder = {
  unitId: '',
  serviceDate: new Date().toISOString().split('T')[0],
  odometerAtService: 0,
  serviceTypeId: 0,
  providerId: 0,
  statusId: 1201, // Borrador
  laborCost: 0,
  partsCost: 0,
  description: '',
  technicianName: '',
  invoiceNumber: '',
  images: [],
};

const useServiceOrderForm = (initialUnitId?: string): UseServiceOrderFormReturn => {
  const [formData, setFormData] = useState<CreateServiceOrder>({
    ...INITIAL_FORM_STATE,
    unitId: initialUnitId || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const hasHydratedRef = useRef(false);

  const [catalogs, setCatalogs] = useState({
    serviceTypes: [] as CatalogOption[],
    serviceStatuses: [] as CatalogOption[],
    providers: [] as CatalogOption[],
  });

  const resetError = useCallback(() => setError(null), []);

  const hydrate = useCallback(async (): Promise<void> => {
    if (hasHydratedRef.current) return;
    setIsLoading(true);

    try {
      const ts = Date.now();
      const [types, statuses, maintCenters] = await Promise.all([
        api.get(`/catalogs/SERVICE_TYPE?_cb=${ts}`),
        api.get(`/catalogs/SERVICE_STATUS?_cb=${ts}`),
        api.get(`/catalogs/MAINTENANCE_CENTER?_cb=${ts}`),
      ]);

      if (isMountedRef.current) {
        setCatalogs({
          serviceTypes: extractCatalogData(types),
          serviceStatuses: extractCatalogData(statuses),
          providers: extractCatalogData(maintCenters),
        });
        hasHydratedRef.current = true;
      }
    } catch (err) {
      setError('Error al cargar catálogos de servicio.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
    return (): void => {
      isMountedRef.current = false;
    };
  }, [hydrate]);

  const handleSubmit = async (e: React.FormEvent, onSuccess?: () => void): Promise<void> => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    // Validation Shield
    if (
      !formData.unitId ||
      !formData.serviceDate ||
      !formData.serviceTypeId ||
      !formData.providerId
    ) {
      const msg = '🚨 Los campos con (*) son obligatorios para el cumplimiento.';
      setError(msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/services', formData);
      if (res.data.success) {
        if (onSuccess) onSuccess();
      } else {
        throw new Error(res.data.error || 'Falla en el registro de servicio.');
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
        (err as Error).message;
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    setFormData,
    isLoading,
    isSubmitting,
    error,
    resetError,
    ...catalogs,
    handleSubmit,
  };
};

export default useServiceOrderForm;
