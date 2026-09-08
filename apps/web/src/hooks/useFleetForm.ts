import React, { useState, useCallback, useEffect, useRef, MutableRefObject } from 'react';
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

const INITIAL_CATALOGS_STATE: CatalogsState = {
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
};

/** 🌊 Pure Cascade Fetcher — a nivel de módulo (FC166 Track D — Gate 2
 * `max-lines-per-function`): no cierra sobre nada del closure de
 * `useFleetForm` (solo usa sus propios argumentos + `api`/
 * `extractCatalogData`), así que vivir fuera del hook es un movimiento
 * verbatim, no solo una extracción cosmética — tampoco se recrea en cada
 * render. */
async function fetchCategory(category: string, parentId?: number): Promise<CatalogOption[]> {
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
      const fallback = await api.get<{ success: boolean; data: CatalogOption[] } | CatalogOption[]>(
        `/catalogs/${category}?_cb=${ts}`
      );
      return extractCatalogData(fallback);
    }
    return data;
  } catch (err) {
    // 🛡️ Zero-Noise Test Shield
    const isTest =
      typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || !!process.env.VITEST);
    if (!isTest) {
      // eslint-disable-next-line no-console -- diagnóstico intencional, gateado por el Zero-Noise Test Shield
      console.error(`[Archon Alpha] Fetch Failure: ${category}`, err);
    }
    return [];
  }
}

/** 🛡️ Mount Shield local — mismo patrón que `useMountedRef` de
 * `useSilkHydration.ts`, duplicado aquí en vez de importado para no acoplar
 * dos dominios (fleet-form / silk-hydration) que hoy no se relacionan (FC166
 * Track D — Gate 2); mismo comportamiento verbatim. */
function useMountedFlag(): MutableRefObject<boolean> {
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return (): void => {
      isMountedRef.current = false;
    };
  }, []);
  return isMountedRef;
}

interface HydrationSetters {
  isMountedRef: MutableRefObject<boolean>;
  hasHydratedRef: MutableRefObject<boolean>;
  setCatalogs: React.Dispatch<React.SetStateAction<CatalogsState>>;
  setFormData: React.Dispatch<React.SetStateAction<CreateFleetUnit>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

/** Mapa campo-de-`CatalogsState` ↔ código de catálogo — única fuente de
 * verdad consumida por `fetchAllFleetCatalogsNamed` (evita repetir los 21
 * nombres 3 veces: destructuring + Promise.all + objeto de retorno). Vive a
 * nivel de módulo, así que no cuenta contra el presupuesto de líneas de la
 * función (Gate 2). */
const FLEET_CATALOG_SPECS: ReadonlyArray<
  [keyof Omit<CatalogsState, 'marcas' | 'modelos'>, string]
> = [
  ['assetTypes', 'ASSET_TYPE'],
  ['fuelTypes', 'FUEL'],
  ['driveTypes', 'DRIVE_TYPE'],
  ['transmissionTypes', 'TRANSMISSION'],
  ['freqTime', 'FREQ_TIME'],
  ['freqUsage', 'FREQ_USAGE'],
  ['departments', 'DEPARTMENT'],
  ['locations', 'LOCATION'],
  ['useTypes', 'OPERATIONAL_USE'],
  ['tireBrands', 'TIRE_BRAND'],
  ['lubeBrands', 'LUBE_BRAND'],
  ['filterBrands', 'FILTER_BRAND'],
  ['engineTypes', 'ENGINE_TYPE'],
  ['terrainTypes', 'TERRAIN_TYPE'],
  ['owners', 'FLEET_OWNER'],
  ['complianceStatuses', 'COMPLIANCE_STATUS'],
  ['colors', 'VEHICLE_COLOR'],
  ['maintenanceCenters', 'MAINTENANCE_CENTER'],
  ['insuranceCompanies', 'INSURANCE_COMPANY'],
  ['routeOrigins', 'ROUTE_ORIGIN'],
  ['environmentalHolograms', 'ENVIRONMENTAL_HOLOGRAM'],
];

/** Dispara los 21 fetches de catálogos base en paralelo, ya devueltos con las
 * claves de `CatalogsState` (evita un destructuring/merge gigante en el
 * caller) — extraída de `runFleetFormHydration` por el mismo motivo (Gate
 * 2); mismos catálogos/orden verbatim (data-driven vía `FLEET_CATALOG_SPECS`
 * en vez de repetir los 21 nombres). */
async function fetchAllFleetCatalogsNamed(): Promise<Omit<CatalogsState, 'marcas' | 'modelos'>> {
  const results = await Promise.all(FLEET_CATALOG_SPECS.map(([, code]) => getCatalog(code)));
  const entries = FLEET_CATALOG_SPECS.map(([field], i) => [field, results[i]] as const);
  return Object.fromEntries(entries) as Omit<CatalogsState, 'marcas' | 'modelos'>;
}

/** 🏗️ Foundation Hydration — extraída del cuerpo del `useCallback` de
 * `hydrate` por el mismo motivo (Gate 2); mismo comportamiento verbatim
 * (EAGER LOCK antes de cualquier await, fallback de marcas de emergencia). */
async function runFleetFormHydration(setters: HydrationSetters): Promise<void> {
  const { isMountedRef, hasHydratedRef, setCatalogs, setFormData, setIsLoading } = setters;
  // 🛡️ EAGER LOCK: set synchronously (before any await) so the caller
  // effect's own !hasHydratedRef.current guard can never let a second
  // hydrate() through — hydrate is a private closure, its lifecycle effect
  // is its only call site, so a redundant internal guard here was dead code
  // (FC165 F2 Dead-Branch Purge, verified exhaustively before removal).
  hasHydratedRef.current = true;

  setIsLoading(true);

  try {
    const fetched = await fetchAllFleetCatalogsNamed();
    // Initialize brands for the first asset type (usually VEH)
    const brandsInitial = await fetchCategory('BRAND', fetched.assetTypes[0]?.id);

    if (isMountedRef.current) {
      setCatalogs(
        (prev: CatalogsState): CatalogsState => ({
          ...prev,
          ...fetched,
          marcas: brandsInitial.length > 0 ? brandsInitial : (EMERGENCY_BRANDS as CatalogOption[]),
        })
      );

      if (fetched.assetTypes.length > 0) {
        setFormData((prev: CreateFleetUnit): CreateFleetUnit => {
          if (prev.assetTypeId) return prev;
          return { ...prev, assetTypeId: fetched.assetTypes[0].id };
        });
      }
    }
  } catch (err) {
    // Release lock on error to allow retry
    hasHydratedRef.current = false;
    // eslint-disable-next-line no-console -- diagnóstico critico intencional
    console.error('[Archon Alpha] Critical Hydration Failure', err);
  } finally {
    if (isMountedRef.current) setIsLoading(false);
  }
}

/** Dueña del ciclo de vida de hidratación completa (mount-shield + lock +
 * trigger) — extraída de `useFleetForm` por el mismo motivo (Gate 2); mismo
 * comportamiento verbatim. `isMountedRef`/`hasHydratedRef` solo los usa el
 * flujo de hidratación, así que viven encapsulados aquí. */
function useFleetFormHydrationLifecycle(
  shouldHydrate: boolean,
  isLoading: boolean,
  setCatalogs: React.Dispatch<React.SetStateAction<CatalogsState>>,
  setFormData: React.Dispatch<React.SetStateAction<CreateFleetUnit>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
): void {
  const isMountedRef = useMountedFlag();
  const hasHydratedRef = useRef(false);

  const hydrate = useCallback(
    (): Promise<void> =>
      runFleetFormHydration({
        isMountedRef,
        hasHydratedRef,
        setCatalogs,
        setFormData,
        setIsLoading,
      }),
    []
  );

  // Lifecycle & Initialization
  useEffect(() => {
    if (shouldHydrate && isMountedRef.current && !hasHydratedRef.current && !isLoading) {
      hydrate();
    }
  }, [hydrate, shouldHydrate]);
}

/** Cascada Asset→Brand: reinicia brand/model + recarga marcas — extraída del
 * mismo motivo (Gate 2); mismo comportamiento verbatim. */
function useAssetTypeChangeHandler(
  setFormData: React.Dispatch<React.SetStateAction<CreateFleetUnit>>,
  setCatalogs: React.Dispatch<React.SetStateAction<CatalogsState>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
): (id: number) => Promise<void> {
  return async (id: number): Promise<void> => {
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
}

/** Cascada Brand→Model: reinicia model + recarga modelos — extraída del
 * mismo motivo (Gate 2); mismo comportamiento verbatim. */
function useMarcaChangeHandler(
  setFormData: React.Dispatch<React.SetStateAction<CreateFleetUnit>>,
  setCatalogs: React.Dispatch<React.SetStateAction<CatalogsState>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
): (brandId: number) => Promise<void> {
  return async (brandId: number): Promise<void> => {
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
}

/** Submit de alta de unidad — extraída del mismo motivo (Gate 2); mismo
 * comportamiento verbatim (Validation Shield + distinción de error de API
 * vs. genérico). */
function useFleetFormSubmit(
  formData: CreateFleetUnit,
  isSubmitting: boolean,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>,
  setRegistrationSuccess: React.Dispatch<React.SetStateAction<boolean>>
): (e: React.FormEvent, onSuccess?: () => Promise<void>) => Promise<void> {
  return async (e: React.FormEvent, onSuccess?: () => Promise<void>): Promise<void> => {
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
      const apiError = (err as { response?: { data?: { error?: string } } } | undefined)?.response
        ?.data?.error;
      const errorMsg = apiError || (err as Error).message;
      setError(errorMsg);
      throw new Error(errorMsg, { cause: err });
    } finally {
      setIsSubmitting(false);
    }
  };
}

/** Hidrata el formulario en modo edición (marcas/modelos del registro
 * existente) — extraída del mismo motivo (Gate 2); mismo comportamiento
 * verbatim. */
function useHydrateEditUnit(
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setFormData: React.Dispatch<React.SetStateAction<CreateFleetUnit>>,
  setCatalogs: React.Dispatch<React.SetStateAction<CatalogsState>>
): (mappedData: CreateFleetUnit) => Promise<void> {
  return async (mappedData: CreateFleetUnit): Promise<void> => {
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
    } finally {
      setIsLoading(false);
    }
  };
}

/** Lee un `File` como data-URL base64 — extraída de `setSelectedFiles` por el
 * mismo motivo (Gate 2); mismo comportamiento verbatim. */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise<string>((resolve: (value: string) => void): void => {
    const reader = new FileReader();
    reader.onloadend = (): void => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/** 🔱 Archon Alpha Engine — orquesta hidratación de catálogos + cascada
 * Asset→Brand→Model + submit/reset del formulario de alta/edición de
 * unidades. Ver los hooks de módulo arriba para cada pieza. */
export default function useFleetForm(shouldHydrate: boolean = false): UseFleetFormReturn {
  const [formData, setFormData] = useState<CreateFleetUnit>(getInitialFleetForm());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);
  const [catalogs, setCatalogs] = useState<CatalogsState>(INITIAL_CATALOGS_STATE);

  const resetError = useCallback(() => setError(null), []);

  useFleetFormHydrationLifecycle(shouldHydrate, isLoading, setCatalogs, setFormData, setIsLoading);

  const handleAssetTypeChange = useAssetTypeChangeHandler(setFormData, setCatalogs, setIsLoading);
  const handleMarcaChange = useMarcaChangeHandler(setFormData, setCatalogs, setIsLoading);

  const handleModeloChange = (modelId: number): void => {
    setFormData((prev: CreateFleetUnit): CreateFleetUnit => ({ ...prev, modelId }));
  };

  const handleSubmit = useFleetFormSubmit(
    formData,
    isSubmitting,
    setError,
    setIsSubmitting,
    setRegistrationSuccess
  );

  const resetForm = (): void => {
    setFormData(getInitialFleetForm());
    setRegistrationSuccess(false);
    setError(null);
  };

  const hydrateEditUnit = useHydrateEditUnit(setIsLoading, setFormData, setCatalogs);

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
      const base64Files = await Promise.all(files.map(readFileAsBase64));
      setFormData((prev: CreateFleetUnit): CreateFleetUnit => ({ ...prev, images: base64Files }));
    },
  };
}
