import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AxiosResponse } from 'axios';
import { CreateFleetUnit, UseFleetFormReturn, CatalogOption } from '../types/fleet';
import getInitialFleetForm from '../utils/fleetUtils';
import { DEPARTAMENTOS } from '../constants/fleetConstants';
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

/**
 * 🔱 ARCHON SOVEREIGN CONSTANTS (v.21.0.0)
 * Logic: Canonical Codes for deterministic mapping.
 */
const ASSET_CODES = {
  VEHICLE: 'AT_VEH',
  MACHINERY: 'AT_MAQ',
  TOOL: 'AT_HER',
};

/**
 * 🔱 Archon Data Intelligence: Response Envelope Extractor
 * Normalizes backend responses to always return a valid CatalogOption array.
 */
const extractCatalogData = (res: AxiosResponse): CatalogOption[] => {
  const rawData = res.data?.data || res.data || [];
  return Array.isArray(rawData) ? rawData : [];
};

const useFleetForm = (): UseFleetFormReturn => {
  const [formData, setFormData] = useState<CreateFleetUnit>(getInitialFleetForm());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);

  const resetError = useCallback(() => setError(null), []);

  const isMountedRef = React.useRef(true);
  const coreLoadedRef = React.useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return (): void => {
      isMountedRef.current = false;
    };
  }, []);

  // ── 📦 CATALOG STATE (Clean Slate Architecture) ──────────────────────────
  const [assetTypes, setAssetTypes] = useState<CatalogOption[]>([]);
  const [fuelTypes, setFuelTypes] = useState<CatalogOption[]>([]);
  const [driveTypes, setDriveTypes] = useState<CatalogOption[]>([]);
  const [transmissionTypes, setTransmissionTypes] = useState<CatalogOption[]>([]);
  const [marcas, setMarcas] = useState<CatalogOption[]>([]);
  const [modelos, setModelos] = useState<CatalogOption[]>([]);
  const [freqTime, setFreqTime] = useState<CatalogOption[]>([]);
  const [freqUsage, setFreqUsage] = useState<CatalogOption[]>([]);
  const [departments, setDepartments] = useState<CatalogOption[]>([]);
  const [locations, setLocations] = useState<CatalogOption[]>([]);
  const [useTypes, setUseTypes] = useState<CatalogOption[]>([]);
  const [tireBrands, setTireBrands] = useState<CatalogOption[]>([]);
  const [lubeBrands, setLubeBrands] = useState<CatalogOption[]>([]);
  const [filterBrands, setFilterBrands] = useState<CatalogOption[]>([]);
  const [engineTypes, setEngineTypes] = useState<CatalogOption[]>([]);
  const [terrainTypes, setTerrainTypes] = useState<CatalogOption[]>([]);

  // ── 📦 DATA ORCHESTRATION (v.21.0.1) ───────────────────────────────────────

  const fetchBrands = useCallback(async (parentId?: number) => {
    try {
      const url = parentId ? `/catalogs/BRAND?parentId=${parentId}` : '/catalogs/BRAND';
      const res = await api.get(url);
      const data = extractCatalogData(res);

      // Safety Fallback: If filtered returns empty (DB desync), load global
      if (data.length === 0 && parentId) {
        const globalRes = await api.get('/catalogs/BRAND');
        if (isMountedRef.current) setMarcas(extractCatalogData(globalRes));
      } else if (isMountedRef.current) setMarcas(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Archon Catalog Fetch Error (BRAND):', err);
    }
  }, []);

  const fetchModels = useCallback(async (brandId?: number) => {
    try {
      const url = brandId ? `/catalogs/MODEL?parentId=${brandId}` : '/catalogs/MODEL';
      const res = await api.get(url);
      const data = extractCatalogData(res);

      if (data.length === 0 && brandId) {
        const globalRes = await api.get('/catalogs/MODEL');
        if (isMountedRef.current) setModelos(extractCatalogData(globalRes));
      } else if (isMountedRef.current) setModelos(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Archon Catalog Fetch Error (MODEL):', err);
    }
  }, []);

  /**
   * 🔱 Archon Orchestrator: specialized catalog loaders
   */
  const loadServiceCatalogs = async (): Promise<void> => {
    const [lubeB, filterB] = await Promise.all([
      api.get('/catalogs/LUBE_BRAND'),
      api.get('/catalogs/FILTER_BRAND'),
    ]);
    setLubeBrands(extractCatalogData(lubeB));
    setFilterBrands(extractCatalogData(filterB));
  };

  const loadCoreCatalogs = async (): Promise<void> => {
    const [time, usage, fuel, drive, trans, asset, dept] = await Promise.all([
      api.get('/catalogs/FREQ_TIME'),
      api.get('/catalogs/FREQ_USAGE'),
      api.get('/catalogs/FUEL'),
      api.get('/catalogs/DRIVE_TYPE'),
      api.get('/catalogs/TRANSMISSION'),
      api.get('/catalogs/ASSET_TYPE'),
      api.get('/catalogs/DEPARTMENT'),
    ]);
    setFreqTime(extractCatalogData(time));
    setFreqUsage(extractCatalogData(usage));
    setFuelTypes(extractCatalogData(fuel));
    setDriveTypes(extractCatalogData(drive));
    setTransmissionTypes(extractCatalogData(trans));
    setAssetTypes(extractCatalogData(asset));
    setDepartments(extractCatalogData(dept));
  };

  const loadTechnicalCatalogs = async (): Promise<void> => {
    const [engines, terrains] = await Promise.all([
      api.get('/catalogs/ENGINE_TYPE'),
      api.get('/catalogs/TERRAIN'),
    ]);
    setEngineTypes(extractCatalogData(engines));
    setTerrainTypes(extractCatalogData(terrains));
  };

  const loadOperationalCatalogs = async (): Promise<void> => {
    const [uses, locs, tires] = await Promise.all([
      api.get('/catalogs/USE_TYPE'),
      api.get('/catalogs/LOCATION'),
      api.get('/catalogs/TIRE_BRAND'),
    ]);
    setUseTypes(extractCatalogData(uses));
    setLocations(extractCatalogData(locs));
    setTireBrands(extractCatalogData(tires));
  };

  const fetchRootCatalogs = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadOperationalCatalogs(),
        loadServiceCatalogs(),
        loadTechnicalCatalogs(),
        loadCoreCatalogs(),
      ]);
    } catch (err) {
      if (isMountedRef.current) {
        // eslint-disable-next-line no-console
        console.error('Archon Catalog Hydration Failure:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // 🔄 Fetch All Root Catalogs on Mount
  useEffect(() => {
    fetchRootCatalogs();
  }, []);

  // 🔱 TRIGGER 1: Asset Type Code-Centric Synchronization
  useEffect(() => {
    if (assetTypes.length > 0 && !coreLoadedRef.current) {
      const target = assetTypes.find(
        (a) =>
          a.code === ASSET_CODES.VEHICLE ||
          a.label
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .includes('vehiculo')
      );

      if (target) {
        setFormData((prev) => ({ ...prev, assetTypeId: target.id }));
        fetchBrands(target.id);
        coreLoadedRef.current = true;
      }
    }
  }, [assetTypes, fetchBrands]);

  // 🔱 TRIGGER 2: Reactive Brand -> Model Cascade
  useEffect(() => {
    if (formData.marca && marcas.length > 0) {
      const selectedM = marcas.find(
        (m) =>
          m.label.trim().toLowerCase() === formData.marca.trim().toLowerCase() ||
          String(m.id) === String(formData.marcaId)
      );

      if (selectedM) {
        fetchModels(selectedM.id);
      }
    }
  }, [formData.marca, marcas, fetchModels, formData.marcaId]);

  // 🔱 TRIGGER 3: Deterministic Model ID Resolution
  useEffect(() => {
    if (formData.modelo && modelos.length > 0) {
      const normalizedQuery = formData.modelo.trim().toLowerCase();
      const found = modelos.find(
        (m) =>
          m.label.trim().toLowerCase() === normalizedQuery ||
          String(m.id) === String(formData.modeloId)
      );
      if (found && String(formData.modeloId) !== String(found.id)) {
        setFormData((prev) => ({ ...prev, modeloId: String(found.id) }));
      }
    }
  }, [formData.modelo, modelos, formData.modeloId]);

  const availableMarcas = useMemo(
    () =>
      (marcas || [])
        .map((m) => ({ value: m.id.toString(), label: m.label || 'S/N' }))
        .sort((a, b) => (a.label || '').localeCompare(b.label || '')),
    [marcas]
  );

  const availableModelos = useMemo(
    () =>
      (modelos || [])
        .map((m) => ({ value: m.id.toString(), label: m.label || 'S/N' }))
        .sort((a, b) => (a.label || '').localeCompare(b.label || '')),
    [modelos]
  );

  const handleAssetTypeChange = useCallback(
    (id: number): void => {
      setFormData((prev) => ({
        ...prev,
        assetTypeId: id,
        marcaId: '',
        modeloId: '',
        marca: '',
        modelo: '',
      }));
      fetchBrands(id);
    },
    [fetchBrands]
  );

  const handleMarcaChange = useCallback(
    (marcaId: string) => {
      const selected = (marcas || []).find((m) => String(m.id) === marcaId);
      setFormData((prev) => ({
        ...prev,
        marcaId,
        marca: selected?.label || '',
        modeloId: '',
        modelo: '',
      }));
      if (selected) fetchModels(selected.id);
    },
    [marcas, fetchModels]
  );

  const handleModeloChange = useCallback(
    (modeloId: string) => {
      const selected = modelos.find((m) => String(m.id) === modeloId);
      if (selected) {
        setFormData((prev) => ({
          ...prev,
          modeloId,
          modelo: selected.label,
        }));
      }
    },
    [modelos]
  );

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
    freqTime: freqTime.map((f) => f.label).sort(),
    freqUsage: freqUsage
      .map((f) => ({ id: f.id, label: f.label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    departments: (departments.length > 0
      ? departments.map((d) => d.label)
      : (DEPARTAMENTOS as unknown as string[])
    ).sort(),
    locations: locations.map((l) => l.label).sort(),
    useTypes: useTypes.map((u) => u.label).sort(),
    tireBrands: tireBrands.map((b) => b.label).sort(),
    lubeBrands: lubeBrands.map((b) => b.label).sort(),
    filterBrands: filterBrands.map((b) => b.label).sort(),
    engineTypes: engineTypes.map((e) => e.label).sort(),
    terrainTypes: terrainTypes.map((t) => t.label).sort(),
    setFormData,
    setRegistrationSuccess,
    isLoading,
    setError,
    handleAssetTypeChange,
    handleMarcaChange,
    handleModeloChange,
    handleSubmit,
    resetForm,
    marcas,
    modelos,
  };
};

export default useFleetForm;
