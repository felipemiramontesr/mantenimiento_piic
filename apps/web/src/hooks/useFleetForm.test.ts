import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { http, HttpResponse } from 'msw';
import useFleetForm from './useFleetForm';
import server from '../test/server';

/**
 * 🔱 Archon Test Suite: useFleetForm
 * Implementation: 100% Core Logic Coverage (Pillar 2 - v.18.0.0)
 */
describe('useFleetForm Hook', () => {
  it('should initialize with default fleet form data', (): void => {
    const { result } = renderHook(() => useFleetForm());
    expect(result.current.formData.id).toBe('ASM-002');
    expect(result.current.formData.assetTypeId).toBe(1);
  });

  it('should handle asset type changes correctly', (): void => {
    const { result } = renderHook(() => useFleetForm());
    act((): void => {
      result.current.handleAssetTypeChange(2);
    });
    expect(result.current.formData.assetTypeId).toBe(2);
    expect(result.current.formData.marca).toBe('');
    expect(result.current.formData.modelo).toBe('');
  });

  it('should handle marca changes and update available models', async (): Promise<void> => {
    const { result } = renderHook(() => useFleetForm());

    // Wait for initial brands to load
    await waitFor(() => {
      expect(result.current.availableMarcas).toContainEqual({ value: '101', label: 'Toyota' });
    });

    act((): void => {
      result.current.handleMarcaChange('101');
    });

    expect(result.current.formData.marca).toBe('Toyota');

    // Wait for models to load
    await waitFor(() => {
      expect(result.current.availableModelos).toContainEqual({ value: '201', label: 'Hilux' });
    });
  });

  it('should successfully submit form and set success state', async (): Promise<void> => {
    const onSuccess = vi.fn(async (): Promise<void> => {
      /* No-op */
    });
    const { result } = renderHook(() => useFleetForm());

    await act(async (): Promise<void> => {
      const e = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      await result.current.handleSubmit(e, onSuccess);
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.registrationSuccess).toBe(true);
  });

  it('should throw error when submitting with missing required fields', async (): Promise<void> => {
    const { result } = renderHook(() => useFleetForm());

    // Clear required field
    act((): void => {
      result.current.setFormData((prev) => ({ ...prev, id: '' }));
    });

    await expect(async (): Promise<void> => {
      const e = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      await result.current.handleSubmit(e);
    }).rejects.toThrow('Por favor, completa todos los campos obligatorios (*)');

    await waitFor(() => {
      expect(result.current.error).toBe('Por favor, completa todos los campos obligatorios (*)');
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

    const { result } = renderHook(() => useFleetForm());

    await expect(async (): Promise<void> => {
      const e = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      await result.current.handleSubmit(e);
    }).rejects.toThrow('DB Connection Error');

    await waitFor(() => {
      expect(result.current.error).toBe('DB Connection Error');
    });
    expect(result.current.registrationSuccess).toBe(false);
  });

  it('should reset form state to initial values', (): void => {
    const { result } = renderHook(() => useFleetForm());

    act((): void => {
      result.current.setFormData((prev) => ({ ...prev, id: 'MODIFIED' }));
      result.current.setRegistrationSuccess(true);
    });

    act((): void => {
      result.current.resetForm();
    });

    expect(result.current.formData.id).toBe('ASM-002');
    expect(result.current.registrationSuccess).toBe(false);
  });
});
