import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import api from './client';
import { initOrder, getOrderById, updateTask, closeOrder } from './upa';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('api/upa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initOrder posts to /work-orders/init and returns the unwrapped data', async () => {
    (api.post as Mock).mockResolvedValue({
      data: { success: true, data: { workOrderId: 1, uuid: 'uuid-1', taskCount: 5 } },
    });

    const result = await initOrder({ vehicleId: 'ASM-001' });

    expect(api.post).toHaveBeenCalledWith('/work-orders/init', { vehicleId: 'ASM-001' });
    expect(result).toEqual({ workOrderId: 1, uuid: 'uuid-1', taskCount: 5 });
  });

  it('getOrderById fetches the work order and returns the unwrapped data', async () => {
    (api.get as Mock).mockResolvedValue({
      data: { success: true, data: { id: 1, uuid: 'uuid-1', tasks: [] } },
    });

    const result = await getOrderById(1);

    expect(api.get).toHaveBeenCalledWith('/work-orders/1');
    expect(result).toEqual({ id: 1, uuid: 'uuid-1', tasks: [] });
  });

  it('updateTask patches the task with the given payload', async () => {
    (api.patch as Mock).mockResolvedValue({ data: {} });

    await updateTask(1, 'triage_dashboard_lights', { status: 'completed' });

    expect(api.patch).toHaveBeenCalledWith('/work-orders/1/tasks/triage_dashboard_lights', {
      status: 'completed',
    });
  });

  it('closeOrder posts to the close endpoint for the given work order', async () => {
    (api.post as Mock).mockResolvedValue({ data: {} });

    await closeOrder(1);

    expect(api.post).toHaveBeenCalledWith('/work-orders/1/close');
  });
});
