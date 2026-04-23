import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AxiosResponse } from 'axios';
import { CreateFleetUnit, UseFleetFormReturn, CatalogOption } from '../types/fleet';
import getInitialFleetForm from '../utils/fleetUtils';
import api from '../api/client';

/**
 * Archon Alpha Engine (v.36.0.0)
 * Logic: Deterministic Sync Machine with Fail-Safe Hydration.
 */

const extractCatalogData = (res: AxiosResponse): CatalogOption[] => {
  const rawData = res.data?.data || res.data || [];
  return Array.isArray(rawData) ? rawData : [];
};

const EMERGENCY_BRANDS = [
  { id: 9001, code: 'B_TOYOTA', label: 'Toyota' },
  { id: 9002, code: 'B_NISSAN', label: 'Nissan' },
  { id: 9003, code: 'B_FORD', label: 'Ford' },
  { id: 9004, code: 'B_CAT', label: 'Caterpillar' },
  { id: 9005, code: 'B_JD', label: 'John Deere' },
  { id: 9006, code: 'B_CASE', label: 'Case' },
  { id: 9007, code: 'B_GENERIC', label: 'Generico / Otros' },
];

const useFleetForm = (): UseFleetFormReturn => {
  const [formData, setFormData] = useState<CreateFleetUnit>(getInitialFleetForm());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const hasHydratedRef = useRef(false);

  const [catalogs, setCatalogs] = useState({
    assetTypes: [] as CatalogOption[],
    fuelTypes: [] as CatalogOption[],
    driveTypes: [] as CatalogOption[],
    transmissionTypes: [] as CatalogOption[],
    marcas: [] as CatalogOption[],
    modelos: [] as CatalogOption[],
    freqTime: [] as CatalogOption[],
    freqUsage: [] as CatalogOption[],
    departments: [] as CatalogOption[],
    locations: [] as CatalogOption[],
    useTypes: [] as CatalogOption[],
    tireBrands: [] as CatalogOption[],
    lubeBrands: [] as CatalogOption[],
    filterBrands: [] as CatalogOption[],
    engineTypes: [] as CatalogOption[],
    terrainTypes: [] as CatalogOption[],
  });

  const resetError = useCallback(() => setError(null), []);

  const fetchCategory = async (category: string, parentId?: number): Promise<CatalogOption[]> => {
    const ts = Date.now();
    const pid = parentId ? Number(parentId) : null;
    const url = pid
      ? `/catalogs/${category}?parentId=${pid}&_cb=${ts}`
      : `/catalogs/${category}?_cb=${ts}`;

    try {
      const res = await api.get(url);
      const data = extractCatalogData(res);
      if (data.length === 0 && pid) {
        const globalRes = await api.get(`/catalogs/${category}?_cb=${ts}`);
        return extractCatalogData(globalRes);
      }
      return data;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Archon Alpha] Fetch Failure', err);
      return [];
    }
  };

  const hydrate = useCallback(async (): Promise<void> => {
    if (hasHydratedRef.current) return;
    setIsLoading(true);

    try {
      const ts = Date.now();
      const [
        asset,
        fuel,
        drive,
        trans,
        time,
        usage,
        dept,
        loc,
        uses,
        tires,
        lube,
        filter,
        engines,
        terrains,
      ] = await Promise.all([
        api.get(`/catalogs/ASSET_TYPE?_cb=${ts}`),
        api.get(`/catalogs/FUEL?_cb=${ts}`),
        api.get(`/catalogs/DRIVE_TYPE?_cb=${ts}`),
        api.get(`/catalogs/TRANSMISSION?_cb=${ts}`),
        api.get(`/catalogs/FREQ_TIME?_cb=${ts}`),
        api.get(`/catalogs/FREQ_USAGE?_cb=${ts}`),
        api.get(`/catalogs/DEPARTMENT?_cb=${ts}`),
        api.get(`/catalogs/LOCATION?_cb=${ts}`),
        api.get(`/catalogs/USE_TYPE?_cb=${ts}`),
        api.get(`/catalogs/TIRE_BRAND?_cb=${ts}`),
        api.get(`/catalogs/LUBE_BRAND?_cb=${ts}`),
        api.get(`/catalogs/FILTER_BRAND?_cb=${ts}`),
        api.get(`/catalogs/ENGINE_TYPE?_cb=${ts}`),
        api.get(`/catalogs/TERRAIN?_cb=${ts}`),
      ]);

      const assetList = extractCatalogData(asset);
      const brandsInitial = await fetchCategory('BRAND', assetList[0]?.id);

      if (isMountedRef.current) {
        setCatalogs((prev) => ({
          ...prev,
          assetTypes: assetList,
          fuelTypes: extractCatalogData(fuel),
          driveTypes: extractCatalogData(drive),
          transmissionTypes: extractCatalogData(trans),
          freqTime: extractCatalogData(time),
          freqUsage: extractCatalogData(usage),
          departments: extractCatalogData(dept),
          locations: extractCatalogData(loc),
          useTypes: extractCatalogData(uses),
          tireBrands: extractCatalogData(tires) as CatalogOption[],
          lubeBrands: extractCatalogData(lube) as CatalogOption[],
          filterBrands: extractCatalogData(filter) as CatalogOption[],
          engineTypes: extractCatalogData(engines) as CatalogOption[],
          terrainTypes: extractCatalogData(terrains) as CatalogOption[],
          marcas: brandsInitial.length > 0 ? brandsInitial : (EMERGENCY_BRANDS as CatalogOption[]),
        }));

        if (assetList.length > 0) {
          setFormData((prev) => ({ ...prev, assetTypeId: assetList[0].id }));
        }
        hasHydratedRef.current = true;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Archon Alpha] Hydration Critical Failure', err);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
    return () => {
      isMountedRef.current = false;
    };
  }, [hydrate]);

  const handleAssetTypeChange = async (id: number): Promise<void> => {
    setFormData((prev) => ({
      ...prev,
      assetTypeId: id,
      marcaId: '',
      modeloId: '',
      marca: '',
      modelo: '',
    }));
    setIsLoading(true);
    const brands = await fetchCategory('BRAND', id);
    setCatalogs((prev) => ({
      ...prev,
      marcas: brands.length > 0 ? brands : (EMERGENCY_BRANDS as CatalogOption[]),
    }));
    setIsLoading(false);
  };

  const handleMarcaChange = async (marcaId: string): Promise<void> => {
    const selected = catalogs.marcas.find((m) => String(m.id) === String(marcaId));
    setFormData((prev) => ({
      ...prev,
      marcaId,
      marca: selected?.label || '',
      modeloId: '',
      modelo: '',
    }));
    if (selected) {
      setIsLoading(true);
      const models = await fetchCategory('MODEL', selected.id);
      setCatalogs((prev) => ({ ...prev, modelos: models }));
      setIsLoading(false);
    }
  };

  const handleModeloChange = (modeloId: string): void => {
    const selected = catalogs.modelos.find((m) => String(m.id) === String(modeloId));
    if (selected) {
      setFormData((prev) => ({ ...prev, modeloId, modelo: selected.label }));
    }
  };

  const availableMarcas = useMemo(
    () => catalogs.marcas.map((m) => ({ value: m.id.toString(), label: m.label || 'S/N' })),
    [catalogs.marcas]
  );

  const availableModelos = useMemo(
    () => catalogs.modelos.map((m) => ({ value: m.id.toString(), label: m.label || 'S/N' })),
    [catalogs.modelos]
  );

  const handleSubmit = async (
    e: React.FormEvent,
    onSuccess?: () => Promise<void>
  ): Promise<void> => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
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
      const res = await api.post('/fleet', formData);
      if (res.data.success) {
        if (onSuccess) await onSuccess();
        setRegistrationSuccess(true);
      } else {
        throw new Error(res.data.error || 'Server Error');
      }
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMsg = (err as any).response?.data?.error || (err as Error).message;
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = (): void => {
    setFormData(getInitialFleetForm());
    setRegistrationSuccess(false);
    setError(null);
  };

  return {
    ...catalogs,
    formData,
    error,
    isSubmitting,
    isLoading,
    registrationSuccess,
    availableMarcas,
    availableModelos,
    freqTime: catalogs.freqTime.map((f) => f.label),
    freqUsage: catalogs.freqUsage.map((f) => ({ id: f.id, label: f.label })),
    departments: catalogs.departments.map((d) => d.label),
    locations: catalogs.locations.map((l) => l.label),
    useTypes: catalogs.useTypes.map((u) => u.label),
    tireBrands: catalogs.tireBrands.map((b: CatalogOption) => b.label),
    lubeBrands: catalogs.lubeBrands.map((b: CatalogOption) => b.label),
    filterBrands: catalogs.filterBrands.map((b: CatalogOption) => b.label),
    engineTypes: catalogs.engineTypes.map((e: CatalogOption) => e.label),
    terrainTypes: catalogs.terrainTypes.map((t: CatalogOption) => t.label),
    setFormData,
    setRegistrationSuccess,
    setError,
    handleAssetTypeChange,
    handleMarcaChange,
    handleModeloChange,
    handleSubmit,
    resetError,
    resetForm,
  };
};

export default useFleetForm;
