/**
 * FC-10 VIM_SubUniverse_FamiliarScope FaseB — useRealtimeTelemetry
 *
 * AT-FC10-B-WEB-1: usa VITE_TELEMETRY_INTERVAL_MS como intervalo de polling
 * AT-FC10-B-WEB-2: llama /telemetry/heartbeat cada 30 segundos
 * AT-FC10-B-WEB-3: llama /telemetry/units en el intervalo de polling (default 10s)
 * AT-FC10-B-WEB-4: limpia ambos intervalos en unmount
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import api from '../api/client';
import { useRealtimeTelemetry } from './useRealtimeTelemetry';

vi.mock('../api/client', () => ({ default: { get: vi.fn() } }));

const MOCK_UNITS_RESPONSE = { data: { units: [] } };

describe('FC-10 VIM_SubUniverse_FamiliarScope FaseB — useRealtimeTelemetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(api.get).mockResolvedValue(MOCK_UNITS_RESPONSE);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('AT-FC10-B-WEB-1: usa VITE_TELEMETRY_INTERVAL_MS como intervalo de polling', async () => {
    vi.stubEnv('VITE_TELEMETRY_INTERVAL_MS', '5000');
    const { unmount } = renderHook(() => useRealtimeTelemetry());
    // Flush initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const callsAtMount = vi
      .mocked(api.get)
      .mock.calls.filter(([url]) => url === '/telemetry/units').length;
    // Advance by 5s (custom interval)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    const callsAfterPoll = vi
      .mocked(api.get)
      .mock.calls.filter(([url]) => url === '/telemetry/units').length;
    expect(callsAfterPoll).toBeGreaterThan(callsAtMount);
    unmount();
  });

  it('AT-FC10-B-WEB-2: llama /telemetry/heartbeat cada 30 segundos', async () => {
    const { unmount } = renderHook(() => useRealtimeTelemetry());
    // Before 30s: no heartbeat calls
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    const heartbeatsBefore = vi
      .mocked(api.get)
      .mock.calls.filter(([url]) => url === '/telemetry/heartbeat').length;
    expect(heartbeatsBefore).toBe(0);
    // Advance past 30s
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    const heartbeatsAfter = vi
      .mocked(api.get)
      .mock.calls.filter(([url]) => url === '/telemetry/heartbeat').length;
    expect(heartbeatsAfter).toBeGreaterThanOrEqual(1);
    unmount();
  });

  it('AT-FC10-B-WEB-3: llama /telemetry/units en el intervalo de polling (default 10s)', async () => {
    const { unmount } = renderHook(() => useRealtimeTelemetry());
    // Flush initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const callsAtMount = vi
      .mocked(api.get)
      .mock.calls.filter(([url]) => url === '/telemetry/units').length;
    expect(callsAtMount).toBeGreaterThanOrEqual(1);
    // Advance by default 10s interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    const callsAfterInterval = vi
      .mocked(api.get)
      .mock.calls.filter(([url]) => url === '/telemetry/units').length;
    expect(callsAfterInterval).toBeGreaterThan(callsAtMount);
    unmount();
  });

  it('AT-FC10-B-WEB-4: limpia ambos intervalos en unmount', async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useRealtimeTelemetry());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
  });
});
