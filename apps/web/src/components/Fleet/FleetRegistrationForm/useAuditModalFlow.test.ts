import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuditModalFlow, auditModalTitle, AuditModalFlowParams } from './useAuditModalFlow';
import api from '../../../api/client';
import { CreateFleetUnit } from '../../../types/fleet';

/**
 * FC162 F2 — useAuditModalFlow.ts had no dedicated test — only indirectly
 * exercised via FleetRegistrationForm.test.tsx's render, which never opens
 * the audit modal or drives delete/update. Covers new-unit submit (bypasses
 * the modal), edit submit (opens modal → confirm → PATCH), and delete
 * (opens modal → confirm → DELETE), plus both API failure paths.
 */

vi.mock('../../../api/client', () => ({ default: { patch: vi.fn(), delete: vi.fn() } }));

const FORM_DATA = { id: 'ASM-001' } as CreateFleetUnit;

function makeParams(overrides: Partial<AuditModalFlowParams> = {}): AuditModalFlowParams {
  return {
    isEdit: true,
    unitId: 'ASM-001',
    formData: FORM_DATA,
    setError: vi.fn(),
    onSuccess: vi.fn().mockResolvedValue(undefined),
    handleSubmit: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('auditModalTitle', () => {
  it('titles an UPDATE as a technical update for the asset', () => {
    expect(auditModalTitle('UPDATE', 'ASM-001')).toBe(
      'Actualización técnica para el activo ASM-001'
    );
  });

  it('titles a DELETE as a definitive decommission', () => {
    expect(auditModalTitle('DELETE', 'ASM-001')).toBe(
      'Baja definitiva del activo ASM-001 del inventario industrial'
    );
  });
});

describe('useAuditModalFlow', () => {
  it('a new-unit submit (isEdit=false) bypasses the modal entirely', async () => {
    const params = makeParams({ isEdit: false });
    const { result } = renderHook(() => useAuditModalFlow(params));

    await act(async () => {
      await result.current.handleFormSubmit({ preventDefault: vi.fn() } as never);
    });

    expect(params.handleSubmit).toHaveBeenCalled();
    expect(result.current.isAuditModalOpen).toBe(false);
  });

  it('an edit submit without a captured reason opens the UPDATE modal instead of submitting', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useAuditModalFlow(params));

    await act(async () => {
      await result.current.handleFormSubmit({ preventDefault: vi.fn() } as never);
    });

    expect(result.current.isAuditModalOpen).toBe(true);
    expect(result.current.auditAction).toBe('UPDATE');
    expect(params.handleSubmit).not.toHaveBeenCalled();
  });

  it('confirming the UPDATE modal captures the reason and closes it without submitting yet', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useAuditModalFlow(params));

    act(() => {
      result.current.requestDelete(); // just to flip auditAction away from default first
    });
    act(() => {
      result.current.closeModal();
    });
    await act(async () => {
      await result.current.handleFormSubmit({ preventDefault: vi.fn() } as never);
    });
    expect(result.current.auditAction).toBe('UPDATE');

    await act(async () => {
      await result.current.confirmModal('Actualización de kilometraje');
    });

    expect(result.current.capturedReason).toBe('Actualización de kilometraje');
    expect(result.current.isAuditModalOpen).toBe(false);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('re-submitting after a captured reason calls api.patch and onSuccess', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useAuditModalFlow(params));

    await act(async () => {
      await result.current.handleFormSubmit({ preventDefault: vi.fn() } as never);
    });
    await act(async () => {
      await result.current.confirmModal('Actualización de kilometraje');
    });
    vi.mocked(api.patch).mockResolvedValueOnce({ data: { success: true } });
    await act(async () => {
      await result.current.handleFormSubmit({ preventDefault: vi.fn() } as never);
    });

    expect(api.patch).toHaveBeenCalledWith('/fleet/ASM-001', {
      data: FORM_DATA,
      reason: 'Actualización de kilometraje',
    });
    expect(params.onSuccess).toHaveBeenCalled();
  });

  it('requestDelete opens the DELETE modal; confirming it calls api.delete and onSuccess', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useAuditModalFlow(params));

    act(() => result.current.requestDelete());
    expect(result.current.isAuditModalOpen).toBe(true);
    expect(result.current.auditAction).toBe('DELETE');

    vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });
    await act(async () => {
      await result.current.confirmModal('Unidad dada de baja por siniestro total');
    });

    expect(api.delete).toHaveBeenCalledWith('/fleet/ASM-001', {
      data: { reason: 'Unidad dada de baja por siniestro total' },
    });
    expect(params.onSuccess).toHaveBeenCalled();
    expect(result.current.isAuditModalOpen).toBe(false);
  });

  it('surfaces the server error detail on a failed PATCH without closing silently', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useAuditModalFlow(params));
    await act(async () => {
      await result.current.handleFormSubmit({ preventDefault: vi.fn() } as never);
    });
    await act(async () => {
      await result.current.confirmModal('reason');
    });

    vi.mocked(api.patch).mockRejectedValueOnce({
      response: { data: { error: 'Conflicto de placas', details: { placas: 'ABC-123' } } },
    });
    await act(async () => {
      await result.current.handleFormSubmit({ preventDefault: vi.fn() } as never);
    });

    await waitFor(() =>
      expect(params.setError).toHaveBeenCalledWith('Conflicto de placas — {"placas":"ABC-123"}')
    );
  });

  it('surfaces the server error on a failed DELETE', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useAuditModalFlow(params));
    act(() => result.current.requestDelete());

    vi.mocked(api.delete).mockRejectedValueOnce({
      response: { data: { error: 'La unidad tiene rutas activas' } },
    });
    await act(async () => {
      await result.current.confirmModal('reason');
    });

    await waitFor(() =>
      expect(params.setError).toHaveBeenCalledWith('La unidad tiene rutas activas')
    );
  });

  it('falls back to the Error message on a failed PATCH with no server error field', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useAuditModalFlow(params));
    await act(async () => {
      await result.current.handleFormSubmit({ preventDefault: vi.fn() } as never);
    });
    await act(async () => {
      await result.current.confirmModal('reason');
    });

    vi.mocked(api.patch).mockRejectedValueOnce(new Error('network down'));
    await act(async () => {
      await result.current.handleFormSubmit({ preventDefault: vi.fn() } as never);
    });

    await waitFor(() => expect(params.setError).toHaveBeenCalledWith('network down'));
  });

  it('falls back to a generic message on a failed DELETE with no server error field', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useAuditModalFlow(params));
    act(() => result.current.requestDelete());

    vi.mocked(api.delete).mockRejectedValueOnce('not an Error instance');
    await act(async () => {
      await result.current.confirmModal('reason');
    });

    await waitFor(() =>
      expect(params.setError).toHaveBeenCalledWith('Error al eliminar la unidad')
    );
  });

  // ── R4-C Fc165 F2 Slice 2.3A — unc lines 9,24 ──

  it('falls back to a generic message on a failed PATCH rejection that is not an Error instance', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useAuditModalFlow(params));
    await act(async () => {
      await result.current.handleFormSubmit({ preventDefault: vi.fn() } as never);
    });
    await act(async () => {
      await result.current.confirmModal('reason');
    });

    // No `.response` wrapper and not an Error instance -- errData is
    // undefined (skips the ?? LHS) and `err instanceof Error` is false.
    vi.mocked(api.patch).mockRejectedValueOnce('raw rejection, not an Error');
    await act(async () => {
      await result.current.handleFormSubmit({ preventDefault: vi.fn() } as never);
    });

    await waitFor(() =>
      expect(params.setError).toHaveBeenCalledWith('Error al sincronizar la unidad')
    );
  });

  it('uses the Error message on a failed DELETE that is a plain Error with no server response', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useAuditModalFlow(params));
    act(() => result.current.requestDelete());

    vi.mocked(api.delete).mockRejectedValueOnce(new Error('conexión perdida'));
    await act(async () => {
      await result.current.confirmModal('reason');
    });

    await waitFor(() => expect(params.setError).toHaveBeenCalledWith('conexión perdida'));
  });
});
