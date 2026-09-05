import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUpaWorkspaceState } from './useUpaWorkspaceState';
import type { useUpaOrder } from '../../../hooks/useUpaOrder';

const baseUpa: ReturnType<typeof useUpaOrder> = {
  workOrder: null,
  loading: false,
  error: null,
  initLoading: false,
  taskUpdating: {},
  closingOrder: false,
  startOrder: vi.fn().mockResolvedValue(undefined),
  loadOrder: vi.fn().mockResolvedValue(undefined),
  completeTask: vi.fn().mockResolvedValue(undefined),
  deferTask: vi.fn().mockResolvedValue(undefined),
  closeCurrentOrder: vi.fn().mockResolvedValue(undefined),
  resetOrder: vi.fn(),
};

describe('useUpaWorkspaceState', () => {
  it('handleDeferConfirm does nothing when no task is selected for deferral (deferTaskId guard)', () => {
    const { result } = renderHook(() => useUpaWorkspaceState(baseUpa, undefined));
    result.current.handleDeferConfirm();
    expect(baseUpa.deferTask).not.toHaveBeenCalled();
  });
});
