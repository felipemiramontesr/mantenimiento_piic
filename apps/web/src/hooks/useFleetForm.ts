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

const extractCatalogData = (
  res: AxiosResponse<{ data?: CatalogOption[] } | CatalogOption[]>
): CatalogOption[] => {
  const { data } = res;
  const rawData = (data as { data?: CatalogOption[] })?.data || (data as CatalogOption[]) || [];
  return Array.isArray(rawData) ? rawData : [];
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
}

const useFleetForm = (): UseFleetFormReturn => {
  const [formData, setFormData] = useState<CreateFleetUnit>(getInitialFleetForm());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/ASSET_TYPE?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/FUEL?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/DRIVE_TYPE?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/TRANSMISSION?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/FREQ_TIME?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/FREQ_USAGE?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/DEPARTMENT?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/LOCATION?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/OPERATIONAL_USE?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/TIRE_BRAND?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/LUBE_BRAND?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/FILTER_BRAND?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/ENGINE_TYPE?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/TERRAIN_TYPE?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/FLEET_OWNER?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/COMPLIANCE_STATUS?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/VEHICLE_COLOR?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/MAINTENANCE_CENTER?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/INSURANCE_COMPANY?_cb=${ts}`
        ),
        api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
          `/catalogs/ROUTE_ORIGIN?_cb=${ts}`
        ),
      ]);

      const assetList = extractCatalogData(asset);
      // Initialize brands for the first asset type (usually VEH)
      const brandsInitial = await fetchCategory('BRAND', assetList[0]?.id);

      if (isMountedRef.current) {
        setCatalogs(
          (prev: CatalogsState): CatalogsState => ({
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
            marcas:
              brandsInitial.length > 0 ? brandsInitial : (EMERGENCY_BRANDS as CatalogOption[]),
          })
        );

        if (assetList.length > 0) {
          setFormData(
            (prev: CreateFleetUnit): CreateFleetUnit => ({ ...prev, assetTypeId: assetList[0].id })
          );
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
    return (): void => {
      isMountedRef.current = false;
    };
  }, [hydrate]);

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
        const unitId = res.data.id;

        // 🔱 ASSET ORCHESTRATION: Bulk Upload Evidence
        if (selectedFiles.length > 0) {
          const uploadData = new FormData();
          selectedFiles.forEach((file) => uploadData.append('files', file));
          await api.post(`/fleet/${unitId}/assets`, uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }

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
    selectedFiles,
    setSelectedFiles,
  };
};

export default useFleetForm;
