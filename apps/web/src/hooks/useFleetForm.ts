/* eslint-disable */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AxiosResponse } from 'axios';
import { CreateFleetUnit, UseFleetFormReturn, CatalogOption } from '../types/fleet';
import getInitialFleetForm from '../utils/fleetUtils';
import api from '../api/client';
import { archonCache } from '../utils/archonCache';

/**
 * 🔱 Archon Alpha Engine (v.37.0.0) - THE CASCADE REBUILD
 * Logic: Strict Progressive Cascade (Asset -> Brand -> Model)
 * Architecture: Database-First Deterministic Streams.
 */

const extractCatalogData = (
  res: AxiosResponse<{ data?: CatalogOption[] } | CatalogOption[]>
): CatalogOption[] => {
  const { data } = res;
  const rawData = (data as { data?: CatalogOption[] })?.data || (data as CatalogOption[]) || [];
  return Array.isArray(rawData) ? rawData : [];
};

const getCatalog = async (name: string): Promise<CatalogOption[]> => {
  const cacheKey = `catalog_${name}`;
  const cached = archonCache.get<CatalogOption[]>(cacheKey);
  if (cached) return cached;
  const res = await api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
    `/catalogs/${name}`
  );
  const data = extractCatalogData(res);
  archonCache.set(cacheKey, data);
  return data;
};

const EMERGENCY_BRANDS = [
  { id: 9001, code: 'B_TOYOTA', label: 'Toyota (Safe Mode)' },
  { id: 9002, code: 'B_CATERPILLAR', label: 'Caterpillar (Safe Mode)' },
  { id: 9003, code: 'B_MILWAUKEE', label: 'Milwaukee (Safe Mode)' },
];

interface CatalogsState {
  assetTypes: CatalogOption[];
  fuelTypes: CatalogOption[];
  driveTypes: CatalogOption[];
  transmissionTypes: CatalogOption[];
  marcas: CatalogOption[];
  modelos: CatalogOption[];
  freqTime: CatalogOption[];
  freqUsage: CatalogOption[];
  departments: CatalogOption[];
  locations: CatalogOption[];
  useTypes: CatalogOption[];
  tireBrands: CatalogOption[];
  lubeBrands: CatalogOption[];
  filterBrands: CatalogOption[];
  engineTypes: CatalogOption[];
  terrainTypes: CatalogOption[];
  owners: CatalogOption[];
  complianceStatuses: CatalogOption[];
  colors: CatalogOption[];
  maintenanceCenters: CatalogOption[];
  insuranceCompanies: CatalogOption[];
  routeOrigins: CatalogOption[];
  environmentalHolograms: CatalogOption[];
}

export default function useFleetForm(shouldHydrate: boolean = false): UseFleetFormReturn {
  const [formData, setFormData] = useState<CreateFleetUnit>(getInitialFleetForm());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const hasHydratedRef = useRef(false);

  const [catalogs, setCatalogs] = useState<CatalogsState>({
    assetTypes: [],
    fuelTypes: [],
    driveTypes: [],
    transmissionTypes: [],
    marcas: [],
    modelos: [],
    freqTime: [],
    freqUsage: [],
    departments: [],
    locations: [],
    useTypes: [],
    tireBrands: [],
    lubeBrands: [],
    filterBrands: [],
    engineTypes: [],
    terrainTypes: [],
    owners: [],
    complianceStatuses: [],
    colors: [],
    maintenanceCenters: [],
    insuranceCompanies: [],
    routeOrigins: [],
    environmentalHolograms: [],
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
      const res = await api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(url);
      const data = extractCatalogData(res);

      // If empty but strictly needed, we allow a global lookup ONLY for Brands if parent is missing
      if (data.length === 0 && pid && category === 'BRAND') {
        const fallback = await api.get<
          { success: boolean; data: CatalogOption[] } | CatalogOption[]
        >(`/catalogs/${category}?_cb=${ts}`);
        return extractCatalogData(fallback);
      }
      return data;
    } catch (err) {
      // 🛡️ Zero-Noise Test Shield
      const isTest =
        typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || !!process.env.VITEST);
      if (!isTest) {
        console.error(`[Archon Alpha] Fetch Failure: ${category}`, err);
      }
      return [];
    }
  };

  /**
   * 🏗️ Foundation Hydration
   */
  const hydrate = useCallback(async (): Promise<void> => {
    // 🛡️ EAGER LOCK: Prevent overlapping hydration attempts immediately
    if (hasHydratedRef.current || isLoading) return;
    hasHydratedRef.current = true;

    setIsLoading(true);

    try {
      const [
        assetList,
        fuelList,
        driveList,
        transList,
        timeList,
        usageList,
        deptList,
        locList,
        usesList,
        tireList,
        lubeList,
        filterList,
        engineList,
        terrainList,
        ownerList,
        complianceList,
        colorList,
        maintCenterList,
        insuranceList,
        originList,
        envList,
      ] = await Promise.all([
        getCatalog('ASSET_TYPE'),
        getCatalog('FUEL'),
        getCatalog('DRIVE_TYPE'),
        getCatalog('TRANSMISSION'),
        getCatalog('FREQ_TIME'),
        getCatalog('FREQ_USAGE'),
        getCatalog('DEPARTMENT'),
        getCatalog('LOCATION'),
        getCatalog('OPERATIONAL_USE'),
        getCatalog('TIRE_BRAND'),
        getCatalog('LUBE_BRAND'),
        getCatalog('FILTER_BRAND'),
        getCatalog('ENGINE_TYPE'),
        getCatalog('TERRAIN_TYPE'),
        getCatalog('FLEET_OWNER'),
        getCatalog('COMPLIANCE_STATUS'),
        getCatalog('VEHICLE_COLOR'),
        getCatalog('MAINTENANCE_CENTER'),
        getCatalog('INSURANCE_COMPANY'),
        getCatalog('ROUTE_ORIGIN'),
        getCatalog('ENVIRONMENTAL_HOLOGRAM'),
      ]);

      // Initialize brands for the first asset type (usually VEH)
      const brandsInitial = await fetchCategory('BRAND', assetList[0]?.id);

      if (isMountedRef.current) {
        setCatalogs(
          (prev: CatalogsState): CatalogsState => ({
            ...prev,
            assetTypes: assetList,
            fuelTypes: fuelList,
            driveTypes: driveList,
            transmissionTypes: transList,
            freqTime: timeList,
            freqUsage: usageList,
            departments: deptList,
            locations: locList,
            useTypes: usesList,
            tireBrands: tireList,
            lubeBrands: lubeList,
            filterBrands: filterList,
            engineTypes: engineList,
            terrainTypes: terrainList,
            owners: ownerList,
            complianceStatuses: complianceList,
            colors: colorList,
            maintenanceCenters: maintCenterList,
            insuranceCompanies: insuranceList,
            routeOrigins: originList,
            environmentalHolograms: envList,
            marcas:
              brandsInitial.length > 0 ? brandsInitial : (EMERGENCY_BRANDS as CatalogOption[]),
          })
        );

        if (assetList.length > 0) {
          setFormData((prev: CreateFleetUnit): CreateFleetUnit => {
            if (prev.assetTypeId) return prev;
            return { ...prev, assetTypeId: assetList[0].id };
          });
        }
      }
    } catch (err) {
      // Release lock on error to allow retry
      hasHydratedRef.current = false;
      console.error('[Archon Alpha] Critical Hydration Failure', err);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  // 3. Lifecycle & Initialization
  useEffect(() => {
    if (shouldHydrate && isMountedRef.current && !hasHydratedRef.current && !isLoading) {
      hydrate();
    }
  }, [hydrate, shouldHydrate]);

  useEffect(() => {
    isMountedRef.current = true;
    return (): void => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * 🔱 CASCADE HANDLERS
   */
  const handleAssetTypeChange = async (id: number): Promise<void> => {
    setIsLoading(true);
    setFormData(
      (prev: CreateFleetUnit): CreateFleetUnit => ({
        ...prev,
        assetTypeId: id,
        brandId: null,
        modelId: null,
      })
    );

    const brands = await fetchCategory('BRAND', id);
    setCatalogs(
      (prev: CatalogsState): CatalogsState => ({
        ...prev,
        marcas: brands.length > 0 ? brands : (EMERGENCY_BRANDS as CatalogOption[]),
        modelos: [],
      })
    );
    setIsLoading(false);
  };

  const handleMarcaChange = async (brandId: number): Promise<void> => {
    setIsLoading(true);
    setFormData(
      (prev: CreateFleetUnit): CreateFleetUnit => ({
        ...prev,
        brandId,
        modelId: null,
      })
    );

    const models = await fetchCategory('MODEL', brandId);
    setCatalogs(
      (prev: CatalogsState): CatalogsState => ({
        ...prev,
        modelos: models,
      })
    );
    setIsLoading(false);
  };

  const handleModeloChange = (modelId: number): void => {
    setFormData((prev: CreateFleetUnit): CreateFleetUnit => ({ ...prev, modelId }));
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
      const res = await api.post<{ success: boolean; error?: string; id: string }>(
        '/fleet',
        formData
      );
      if (res.data.success) {
        if (onSuccess) await onSuccess();
        setRegistrationSuccess(true);
      } else {
        throw new Error(res.data.error || 'Server Internal Error');
      }
    } catch (err: unknown) {
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

  const hydrateEditUnit = async (mappedData: CreateFleetUnit): Promise<void> => {
    setIsLoading(true);
    setFormData(mappedData);

    const promises: Promise<CatalogOption[]>[] = [];

    if (mappedData.assetTypeId) {
      promises.push(fetchCategory('BRAND', mappedData.assetTypeId));
    } else {
      promises.push(Promise.resolve([]));
    }

    if (mappedData.brandId) {
      promises.push(fetchCategory('MODEL', mappedData.brandId));
    } else {
      promises.push(Promise.resolve([]));
    }

    try {
      const [brands, models] = await Promise.all(promises);
      setCatalogs(
        (prev: CatalogsState): CatalogsState => ({
          ...prev,
          marcas: brands.length > 0 ? brands : (EMERGENCY_BRANDS as CatalogOption[]),
          modelos: models,
        })
      );
    } catch (err) {
      console.error('[Archon Alpha] Edit Unit Hydration Cascade Failure:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    ...catalogs,
    formData,
    error,
    isSubmitting,
    isLoading,
    registrationSuccess,
    setFormData,
    setRegistrationSuccess,
    setError,
    handleAssetTypeChange,
    handleMarcaChange,
    handleModeloChange,
    handleSubmit,
    resetError,
    resetForm,
    hydrateEditUnit,
    setSelectedFiles: async (files: File[]): Promise<void> => {
      const base64Files = await Promise.all(
        files.map(
          (file: File): Promise<string> =>
            new Promise<string>((resolve: (value: string) => void): void => {
              const reader = new FileReader();
              reader.onloadend = (): void => resolve(reader.result as string);
              reader.readAsDataURL(file);
            })
        )
      );
      setFormData((prev: CreateFleetUnit): CreateFleetUnit => ({ ...prev, images: base64Files }));
    },
  };
}
