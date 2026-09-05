import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from './client';
import { acceptMaintenance, rejectMaintenance } from './maintenance';

vi.mock('./client', () => ({
  default: { patch: vi.fn() },
}));

describe('acceptMaintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads workOrderId from the nested data.data.workOrderId fallback', async () => {
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { success: true, data: { workOrderId: 77 } },
    });
    const result = await acceptMaintenance('uuid-1');
    expect(result).toEqual({ workOrderId: 77 });
  });

  it('throws when workOrderId is missing from both locations', async () => {
    vi.mocked(api.patch).mockResolvedValueOnce({ data: { success: true } });
    await expect(acceptMaintenance('uuid-2')).rejects.toThrow(
      'accept response missing workOrderId'
    );
  });
});

describe('rejectMaintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls PATCH /maintenance/:uuid/reject', async () => {
    vi.mocked(api.patch).mockResolvedValueOnce({ data: { success: true } });
    await rejectMaintenance('uuid-3');
    expect(api.patch).toHaveBeenCalledWith('/maintenance/uuid-3/reject');
  });
});
