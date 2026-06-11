import { describe, it, expect, vi, beforeEach } from 'vitest';
import withConnection from './withConnection';

const mockConnection = {
  release: vi.fn(),
};

vi.mock('../services/db', () => ({
  default: {
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));

describe('withConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns callback result and releases connection on success', async () => {
    const result = await withConnection(async (conn) => {
      expect(conn).toBe(mockConnection);
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(mockConnection.release).toHaveBeenCalledOnce();
  });

  it('releases connection and re-throws on callback error', async () => {
    const boom = new Error('db failure');
    await expect(
      withConnection(async () => {
        throw boom;
      })
    ).rejects.toThrow('db failure');
    expect(mockConnection.release).toHaveBeenCalledOnce();
  });
});
