import React, { useState, useCallback, useEffect, useRef } from 'react';
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
    // 🔱 Sovereign Asset Management Catalogs (v.39.0.0)
    owners: [] as CatalogOption[],
    complianceStatuses: [] as CatalogOption[],
    colors: [] as CatalogOption[],
    maintenanceCenters: [] as CatalogOption[],
    insuranceCompanies: [] as CatalogOption[],
    routeOrigins: [] as CatalogOption[],
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
        ownersRes,
        complianceRes,
        colorsRes,
        maintCentersRes,
        insuranceRes,
        originsRes,
      ] = await Promise.all([
        api.get(`/catalogs/ASSET_TYPE?_cb=${ts}`),
        api.get(`/catalogs/FUEL?_cb=${ts}`),
        api.get(`/catalogs/DRIVE_TYPE?_cb=${ts}`),
        api.get(`/catalogs/TRANSMISSION?_cb=${ts}`),
        api.get(`/catalogs/FREQ_TIME?_cb=${ts}`),
        api.get(`/catalogs/FREQ_USAGE?_cb=${ts}`),
        api.get(`/catalogs/DEPARTMENT?_cb=${ts}`),
        api.get(`/catalogs/LOCATION?_cb=${ts}`),
        api.get(`/catalogs/OPERATIONAL_USE?_cb=${ts}`),
        api.get(`/catalogs/TIRE_BRAND?_cb=${ts}`),
        api.get(`/catalogs/LUBE_BRAND?_cb=${ts}`),
        api.get(`/catalogs/FILTER_BRAND?_cb=${ts}`),
        api.get(`/catalogs/ENGINE_TYPE?_cb=${ts}`),
        api.get(`/catalogs/TERRAIN_TYPE?_cb=${ts}`),
        api.get(`/catalogs/FLEET_OWNER?_cb=${ts}`),
        api.get(`/catalogs/COMPLIANCE_STATUS?_cb=${ts}`),
        api.get(`/catalogs/VEHICLE_COLOR?_cb=${ts}`),
        api.get(`/catalogs/MAINTENANCE_CENTER?_cb=${ts}`),
        api.get(`/catalogs/INSURANCE_COMPANY?_cb=${ts}`),
        api.get(`/catalogs/ROUTE_ORIGIN?_cb=${ts}`),
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
          owners: extractCatalogData(ownersRes),
          complianceStatuses: extractCatalogData(complianceRes),
          colors: extractCatalogData(colorsRes),
          maintenanceCenters: extractCatalogData(maintCentersRes),
          insuranceCompanies: extractCatalogData(insuranceRes),
          routeOrigins: extractCatalogData(originsRes),
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
    setFormData((prev) => ({
      ...prev,
      assetTypeId: id,
      brandId: null,
      modelId: null,
    }));

    const brands = await fetchCategory('BRAND', id);
    setCatalogs((prev) => ({
      ...prev,
      marcas: brands.length > 0 ? brands : (EMERGENCY_BRANDS as CatalogOption[]),
      modelos: [],
    }));
    setIsLoading(false);
  };

  const handleMarcaChange = async (brandId: number): Promise<void> => {
    setIsLoading(true);
    setFormData((prev) => ({
      ...prev,
      brandId,
      modelId: null,
    }));

    const models = await fetchCategory('MODEL', brandId);
    setCatalogs((prev) => ({ ...prev, modelos: models }));
    setIsLoading(false);
  };

  const handleModeloChange = (modelId: number): void => {
    setFormData((prev) => ({ ...prev, modelId }));
  };

  const handleSubmit = async (
    e: React.FormEvent,
    onSuccess?: () => Promise<void>
  ): Promise<void> => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    // Validation Shield
    if (
      !formData.brandId ||
      !formData.modelId ||
      !formData.id ||
      !formData.departmentId ||
      !formData.operationalUseId
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
    freqTime: catalogs.freqTime,
    freqUsage: catalogs.freqUsage,
    departments: catalogs.departments,
    locations: catalogs.locations,
    useTypes: catalogs.useTypes,
    tireBrands: catalogs.tireBrands,
    lubeBrands: catalogs.lubeBrands,
    filterBrands: catalogs.filterBrands,
    engineTypes: catalogs.engineTypes,
    terrainTypes: catalogs.terrainTypes,
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
