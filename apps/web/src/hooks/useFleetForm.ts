import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AxiosResponse } from 'axios';
import { CreateFleetUnit, UseFleetFormReturn, CatalogOption } from '../types/fleet';
import getInitialFleetForm from '../utils/fleetUtils';
import api from '../api/client';

/**
 * 🔱 Archon Alpha Engine (v.37.0.0) - THE CASCADE REBUILD
 * Logic: Strict Progressive Cascade (Asset -> Brand -> Model)
 * Architecture: Database-First Deterministic Streams.
 */

const extractCatalogData = (res: AxiosResponse): CatalogOption[] => {
  const rawData = res.data?.data || res.data || [];
  return Array.isArray(rawData) ? rawData : [];
};

const EMERGENCY_BRANDS = [
  { id: 9001, code: 'B_TOYOTA', label: 'Toyota (Safe Mode)' },
  { id: 9002, code: 'B_CATERPILLAR', label: 'Caterpillar (Safe Mode)' },
  { id: 9003, code: 'B_MILWAUKEE', label: 'Milwaukee (Safe Mode)' },
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

  /**
   * 🌊 Pure Cascade Fetcher
   */
  const fetchCategory = async (category: string, parentId?: number): Promise<CatalogOption[]> => {
    const ts = Date.now();
    const pid = parentId ? Number(parentId) : null;
    // Strict parent filtering
    const url = pid
      ? `/catalogs/${category}?parentId=${pid}&_cb=${ts}`
      : `/catalogs/${category}?_cb=${ts}`;

    try {
      const res = await api.get(url);
      const data = extractCatalogData(res);

      // If empty but strictly needed, we allow a global lookup ONLY for Brands if parent is missing
      if (data.length === 0 && pid && category === 'BRAND') {
        const fallback = await api.get(`/catalogs/${category}?_cb=${ts}`);
        return extractCatalogData(fallback);
      }
      return data;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[Archon Alpha] Fetch Failure: ${category}`, err);
      return [];
    }
  };

  /**
   * 🏗️ Foundation Hydration
   */
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
      // Initialize brands for the first asset type (usually VEH)
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
          tireBrands: extractCatalogData(tires),
          lubeBrands: extractCatalogData(lube),
          filterBrands: extractCatalogData(filter),
          engineTypes: extractCatalogData(engines),
          terrainTypes: extractCatalogData(terrains),
          marcas: brandsInitial.length > 0 ? brandsInitial : (EMERGENCY_BRANDS as CatalogOption[]),
        }));

        if (assetList.length > 0) {
          setFormData((prev) => ({ ...prev, assetTypeId: assetList[0].id }));
        }
        hasHydratedRef.current = true;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Archon Alpha] Critical Hydration Failure', err);
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

  /**
   * 🔱 CASCADE HANDLERS
   */
  const handleAssetTypeChange = async (id: number): Promise<void> => {
    setIsLoading(true);
    // CRITICAL: Reset children in cascade
    setFormData((prev) => ({
      ...prev,
      assetTypeId: id,
      marcaId: '',
      marca: '',
      modeloId: '',
      modelo: '',
    }));

    const brands = await fetchCategory('BRAND', id);
    setCatalogs((prev) => ({
      ...prev,
      marcas: brands.length > 0 ? brands : (EMERGENCY_BRANDS as CatalogOption[]),
      modelos: [], // Clear models catalog
    }));
    setIsLoading(false);
  };

  const handleMarcaChange = async (marcaId: string): Promise<void> => {
    setIsLoading(true);
    const selected = catalogs.marcas.find((m) => String(m.id) === String(marcaId));

    // CRITICAL: Reset dependent model
    setFormData((prev) => ({
      ...prev,
      marcaId,
      marca: selected?.label || '',
      modeloId: '',
      modelo: '',
    }));

    if (selected) {
      const models = await fetchCategory('MODEL', selected.id);
      setCatalogs((prev) => ({ ...prev, modelos: models }));
    } else {
      setCatalogs((prev) => ({ ...prev, modelos: [] }));
    }
    setIsLoading(false);
  };

  const handleModeloChange = (modeloId: string): void => {
    const selected = catalogs.modelos.find((m) => String(m.id) === String(modeloId));
    if (selected) {
      setFormData((prev) => ({ ...prev, modeloId, modelo: selected.label }));
    } else {
      setFormData((prev) => ({ ...prev, modeloId: '', modelo: '' }));
    }
  };

  const availableMarcas = useMemo(
    () => catalogs.marcas.map((m) => ({ value: m.id.toString(), label: m.label })),
    [catalogs.marcas]
  );

  const availableModelos = useMemo(
    () => catalogs.modelos.map((m) => ({ value: m.id.toString(), label: m.label })),
    [catalogs.modelos]
  );

  const handleSubmit = async (
    e: React.FormEvent,
    onSuccess?: () => Promise<void>
  ): Promise<void> => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    // Validation Shield
    if (
      !formData.marca ||
      !formData.modelo ||
      !formData.id ||
      !formData.departamento ||
      !formData.uso
    ) {
      const msg = '🚨 Todos los campos marcados con (*) son obligatorios.';
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
        throw new Error(res.data.error || 'Server Internal Error');
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
    tireBrands: catalogs.tireBrands.map((b) => b.label),
    lubeBrands: catalogs.lubeBrands.map((b) => b.label),
    filterBrands: catalogs.filterBrands.map((b) => b.label),
    engineTypes: catalogs.engineTypes.map((e) => e.label),
    terrainTypes: catalogs.terrainTypes.map((t) => t.label),
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
