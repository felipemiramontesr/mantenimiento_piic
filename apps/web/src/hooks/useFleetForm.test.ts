import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { http, HttpResponse } from 'msw';
import useFleetForm from './useFleetForm';
import server from '../test/server';
import { archonCache } from '../utils/archonCache';

/**
 * 🔱 Archon Test Suite: useFleetForm
 * Implementation: 100% Core Logic Coverage (Pillar 2 - v.18.0.0)
 */
describe('useFleetForm Hook', () => {
  it('should initialize with default fleet form data', async (): Promise<void> => {
    const { result } = renderHook(() => useFleetForm(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });
    expect(result.current.formData.id).toBe('');
    expect(result.current.formData.assetTypeId).toBe(1); // VEH is 1
  });

  it('should handle asset type changes correctly', async (): Promise<void> => {
    const { result } = renderHook(() => useFleetForm(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });
    await act(async (): Promise<void> => {
      await result.current.handleAssetTypeChange(2);
    });
    expect(result.current.formData.assetTypeId).toBe(2);
    expect(result.current.formData.brandId).toBe(null);
    expect(result.current.formData.modelId).toBe(null);
  });

  it('should handle marca changes and update available models', async (): Promise<void> => {
    const { result } = renderHook(() => useFleetForm(true));

    // Wait for initial brands to load
    await waitFor(() => {
      expect(result.current.marcas).toContainEqual(
        expect.objectContaining({ id: 101, label: 'Toyota' })
      );
    });

    act((): void => {
      result.current.handleMarcaChange(101);
    });

    expect(result.current.formData.brandId).toBe(101);

    // Wait for models to load with increased patience
    await waitFor(
      () => {
        expect(result.current.modelos).toContainEqual(
          expect.objectContaining({ id: 201, label: 'Hilux' })
        );
      },
      { timeout: 3000 }
    );
  });

  it('should successfully submit form and set success state', async (): Promise<void> => {
    const onSuccess = vi.fn(async (): Promise<void> => Promise.resolve());
    const { result } = renderHook(() => useFleetForm(true));

    // Wait for initial hydration to avoid act warnings
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

    // Populate ALL required fields as per v35 validation logic
    await act(async () => {
      result.current.setFormData((prev) => ({
        ...prev,
        id: 'UNIT-001',
        brandId: 101,
        modelId: 201,
        departmentId: 228,
        operationalUseId: 236,
        dailyUsageAvg: 10,
        lastServiceReading: 0,
      }));
    });

    await act(async (): Promise<void> => {
      const e = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      await result.current.handleSubmit(e, onSuccess);
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.registrationSuccess).toBe(true);
  });

  it('should throw error when submitting with missing required fields', async (): Promise<void> => {
    const { result } = renderHook(() => useFleetForm(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

    // Initial state is already missing fields, so it should throw
    await act(async () => {
      const e = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      await expect(result.current.handleSubmit(e)).rejects.toThrow(
        '🚨 Todos los campos marcados con (*) son obligatorios.'
      );
    });

    await waitFor(() => {
      expect(result.current.error).toBe('🚨 Todos los campos marcados con (*) son obligatorios.');
    });
  });

  it('should handle server errors during submission', async (): Promise<void> => {
    // Override handler for this test
    server.use(
      http.post(
        '*/fleet',
        (): Response =>
          HttpResponse.json({ success: false, error: 'DB Connection Error' }, { status: 500 })
      )
    );

    const { result } = renderHook(() => useFleetForm(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

    // Populate required fields to bypass client-side validation first
    await act(async () => {
      result.current.setFormData((prev) => ({
        ...prev,
        id: 'UNIT-001',
        brandId: 101,
        modelId: 201,
        departmentId: 228,
        operationalUseId: 236,
        dailyUsageAvg: 10,
        lastServiceReading: 0,
      }));
    });

    await act(async () => {
      const e = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      await expect(result.current.handleSubmit(e)).rejects.toThrow('DB Connection Error');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('DB Connection Error');
    });
    expect(result.current.registrationSuccess).toBe(false);
  });

  it('should reset form state to initial values', async (): Promise<void> => {
    const { result } = renderHook(() => useFleetForm(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

    await act(async (): Promise<void> => {
      result.current.setFormData((prev) => ({ ...prev, id: 'MODIFIED' }));
      result.current.setRegistrationSuccess(true);
    });

    await act(async (): Promise<void> => {
      result.current.resetForm();
    });

    expect(result.current.formData.id).toBe('');
    expect(result.current.registrationSuccess).toBe(false);
  });

  it('should handle modelo changes correctly', async (): Promise<void> => {
    const { result } = renderHook(() => useFleetForm(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });
    await act(async (): Promise<void> => {
      result.current.handleModeloChange(301);
    });
    expect(result.current.formData.modelId).toBe(301);
  });

  it('should reset error state', async (): Promise<void> => {
    const { result } = renderHook(() => useFleetForm(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });
    await act(async (): Promise<void> => {
      result.current.setError('Sample Error');
    });
    expect(result.current.error).toBe('Sample Error');
    await act(async (): Promise<void> => {
      result.current.resetError();
    });
    expect(result.current.error).toBe(null);
  });

  it('should convert files to base64 strings', async (): Promise<void> => {
    const { result } = renderHook(() => useFleetForm(true));
    const file = new File(['foo'], 'foo.txt', { type: 'text/plain' });

    await act(async (): Promise<void> => {
      await result.current.setSelectedFiles([file]);
    });

    expect(result.current.formData.images).toHaveLength(1);
    expect(result.current.formData.images?.[0]).toMatch(/^data:text\/plain;base64,/);
  });

  it('should use emergency brands if catalog fetch returns empty', async (): Promise<void> => {
    // Force empty response for brands
    server.use(http.get('*/catalogs/BRAND', () => HttpResponse.json({ success: true, data: [] })));

    const { result } = renderHook(() => useFleetForm(true));

    await waitFor(() => {
      expect(result.current.marcas).toContainEqual(
        expect.objectContaining({ label: 'Toyota (Safe Mode)' })
      );
    });
  });

  it('should handle fetch failure in fetchCategory', async () => {
    server.use(http.get('*/catalogs/BRAND', () => HttpResponse.error()));

    const { result } = renderHook(() => useFleetForm(true));

    await act(async () => {
      await result.current.handleAssetTypeChange(1);
    });

    expect(result.current.marcas).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Toyota (Safe Mode)' })])
    );
  });
});

/**
 * FC162 R4-C (100% mandatorio, 204_AN/206_AN Bravo) — `hydrateEditUnit` was
 * never called by any existing test (a fully separate function from the
 * create-flow hydration already covered above), the `throw` branch for a
 * 200-status response with `success:false` was only ever exercised via a
 * non-2xx status (which takes the axios-rejection catch path instead, a
 * different statement), and `fetchCategory`'s own console.error sits behind
 * a deliberate "Zero-Noise Test Shield" that only fires outside the test
 * environment.
 */
describe('useFleetForm Hook — handleSubmit success:false (200 status)', () => {
  it('throws using res.data.error when the server responds 200 with success:false', async () => {
    server.use(
      http.post('*/fleet', () =>
        HttpResponse.json({ success: false, error: 'Validation rejected by server' })
      )
    );

    const { result } = renderHook(() => useFleetForm(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

    await act(async () => {
      result.current.setFormData((prev) => ({
        ...prev,
        id: 'UNIT-002',
        brandId: 101,
        modelId: 201,
        departmentId: 228,
        operationalUseId: 236,
        dailyUsageAvg: 10,
        lastServiceReading: 0,
      }));
    });

    await act(async () => {
      const e = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      await expect(result.current.handleSubmit(e)).rejects.toThrow('Validation rejected by server');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Validation rejected by server');
    });
  });
});

describe('useFleetForm Hook — hydrateEditUnit', () => {
  it('fetches brand+model catalogs and hydrates formData when both ids are present', async () => {
    const { result } = renderHook(() => useFleetForm(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

    await act(async () => {
      await result.current.hydrateEditUnit({
        assetTypeId: 1,
        brandId: 101,
        modelId: 201,
        id: 'EDIT-001',
        traccionId: null,
        transmisionId: null,
        fuelTypeId: null,
      });
    });

    expect(result.current.formData.id).toBe('EDIT-001');
    await waitFor(() => {
      expect(result.current.marcas).toContainEqual(
        expect.objectContaining({ id: 101, label: 'Toyota' })
      );
    });
    await waitFor(() => {
      expect(result.current.modelos).toContainEqual(
        expect.objectContaining({ id: 201, label: 'Hilux' })
      );
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('falls back to emergency brands and empty models when assetTypeId/brandId are absent', async () => {
    const { result } = renderHook(() => useFleetForm(true));
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

    await act(async () => {
      await result.current.hydrateEditUnit({
        assetTypeId: null,
        brandId: null,
        modelId: null,
        id: 'EDIT-002',
        traccionId: null,
        transmisionId: null,
        fuelTypeId: null,
      });
    });

    expect(result.current.formData.id).toBe('EDIT-002');
    await waitFor(() => {
      expect(result.current.marcas).toContainEqual(
        expect.objectContaining({ label: 'Toyota (Safe Mode)' })
      );
    });
    expect(result.current.modelos).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useFleetForm Hook — Zero-Noise Test Shield', () => {
  it('logs to console when a catalog fetch fails outside of the test environment', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    server.use(http.get('*/catalogs/BRAND', () => HttpResponse.error()));
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITEST', '');

    const { result } = renderHook(() => useFleetForm(true));
    await act(async () => {
      await result.current.handleAssetTypeChange(1);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Archon Alpha] Fetch Failure'),
      expect.anything()
    );

    vi.unstubAllEnvs();
    consoleSpy.mockRestore();
  });
});

describe('useFleetForm Hook — hydration critical failure', () => {
  it('releases the hydration lock and logs when the initial catalog Promise.all rejects', async () => {
    // getCatalog() checks archonCache first — earlier tests in this file
    // already hydrated successfully, so ASSET_TYPE would be served from a
    // stale cache entry and never hit the mocked failure below.
    archonCache.clear();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    server.use(http.get('*/catalogs/ASSET_TYPE', () => HttpResponse.error()));

    const { result } = renderHook(() => useFleetForm(true));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Archon Alpha] Critical Hydration Failure',
        expect.anything()
      );
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    consoleSpy.mockRestore();
  });
});
