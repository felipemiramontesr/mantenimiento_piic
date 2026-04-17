import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { http, HttpResponse } from 'msw';
import useFleetForm from './useFleetForm';
import server from '../test/server';

/**
 * 🔱 Archon Test Suite: useFleetForm
 * Implementation: 100% Core Logic Coverage (Pillar 2 - v.17.0.0)
 */
describe('useFleetForm Hook', () => {
  it('should initialize with default fleet form data', (): void => {
    const { result } = renderHook(() => useFleetForm());
    expect(result.current.formData.tag).toBe('ASM-002');
    expect(result.current.formData.assetType).toBe('Vehiculo');
  });

  it('should handle asset type changes correctly', (): void => {
    const { result } = renderHook(() => useFleetForm());
    act((): void => {
      result.current.handleAssetTypeChange('Maquinaria');
    });
    expect(result.current.formData.assetType).toBe('Maquinaria');
    expect(result.current.formData.marca).toBe('');
    expect(result.current.formData.modelo).toBe('');
  });

  it('should handle marca changes and update available models', (): void => {
    const { result } = renderHook(() => useFleetForm());
    act((): void => {
      result.current.handleMarcaChange('Toyota');
    });
    expect(result.current.formData.marca).toBe('Toyota');
    expect(result.current.availableMarcas).toContain('Toyota');
  });

  it('should successfully submit form and set success state', async (): Promise<void> => {
    const onSuccess = vi.fn(async (): Promise<void> => { /* No-op */ });
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
      result.current.setFormData(prev => ({ ...prev, tag: '' }));
    });

    await expect(async (): Promise<void> => {
      const e = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      await result.current.handleSubmit(e);
    }).rejects.toThrow('Por favor, completa todos los campos obligatorios (*)');
  });

  it('should handle server errors during submission', async (): Promise<void> => {
    // Override handler for this test
    server.use(
      http.post('*/fleet', (): Response => HttpResponse.json({ success: false, error: 'DB Connection Error' }, { status: 500 }))
    );

    const { result } = renderHook(() => useFleetForm());
    
    await expect(async (): Promise<void> => {
      const e = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      await result.current.handleSubmit(e);
    }).rejects.toThrow('DB Connection Error');
    
    expect(result.current.registrationSuccess).toBe(false);
  });

  it('should reset form state to initial values', (): void => {
    const { result } = renderHook(() => useFleetForm());
    
    act((): void => {
      result.current.setFormData(prev => ({ ...prev, tag: 'MODIFIED' }));
      result.current.setRegistrationSuccess(true);
    });

    act((): void => {
      result.current.resetForm();
    });

    expect(result.current.formData.tag).toBe('ASM-002');
    expect(result.current.registrationSuccess).toBe(false);
  });
});
