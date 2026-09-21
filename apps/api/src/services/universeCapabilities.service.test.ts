import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import findActiveCapabilities from './universeCapabilities.repository';
import {
  getUniverseCapabilities,
  invalidateUniverseCapabilities,
} from './universeCapabilities.service';

/**
 * FC193 F2 — caché por proceso de capacidades (Invariante 5): TTL, invalidación por universo o total,
 * errores sin cachear y la carrera lectura-en-vuelo vs. invalidación.
 */

vi.mock('./universeCapabilities.repository', () => ({ default: vi.fn() }));

const repo = findActiveCapabilities as Mock;

const ROWS = [
  { kind: 'SUPERCLUSTER', code: 'FINANZAS' },
  { kind: 'SUPERCLUSTER', code: 'RASTREO' },
  { kind: 'CLUSTER', code: 'GASTOS_EGRESOS' },
];

describe('FC193 F2 — getUniverseCapabilities / invalidateUniverseCapabilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-21T12:00:00Z'));
    vi.clearAllMocks();
    invalidateUniverseCapabilities();
    repo.mockResolvedValue(ROWS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('separa las filas en el conjunto de SC activos y el de clusters activos', async () => {
    const caps = await getUniverseCapabilities(5);

    expect([...caps.superclusters].sort()).toEqual(['FINANZAS', 'RASTREO']);
    expect([...caps.clusters]).toEqual(['GASTOS_EGRESOS']);
    expect(repo).toHaveBeenCalledWith(5);
  });

  it('dentro del TTL no vuelve a la DB; al vencer (30 s) refresca', async () => {
    await getUniverseCapabilities(5);
    vi.advanceTimersByTime(29_000);
    await getUniverseCapabilities(5);
    expect(repo).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2_000);
    await getUniverseCapabilities(5);
    expect(repo).toHaveBeenCalledTimes(2);
  });

  it('la caché es por universo: otro tenant no reutiliza el estado del primero', async () => {
    repo.mockResolvedValueOnce(ROWS).mockResolvedValueOnce([]);

    const a = await getUniverseCapabilities(5);
    const b = await getUniverseCapabilities(6);

    expect(a.superclusters.size).toBe(2);
    expect(b.superclusters.size).toBe(0);
    expect(repo).toHaveBeenCalledTimes(2);
  });

  it('invalidate(tenantId) descarta solo ese universo (una mutación de Cosmología se ve al instante)', async () => {
    await getUniverseCapabilities(5);
    await getUniverseCapabilities(6);
    repo.mockClear();

    invalidateUniverseCapabilities(5);
    await getUniverseCapabilities(5);
    await getUniverseCapabilities(6);

    expect(repo).toHaveBeenCalledTimes(1);
    expect(repo).toHaveBeenCalledWith(5);
  });

  it('invalidate() sin argumento descarta todos los universos', async () => {
    await getUniverseCapabilities(5);
    await getUniverseCapabilities(6);
    repo.mockClear();

    invalidateUniverseCapabilities();
    await getUniverseCapabilities(5);
    await getUniverseCapabilities(6);

    expect(repo).toHaveBeenCalledTimes(2);
  });

  it('fail-closed: un error de DB se propaga y NO queda cacheado', async () => {
    repo.mockRejectedValueOnce(new Error('db down'));

    await expect(getUniverseCapabilities(5)).rejects.toThrow('db down');
    const caps = await getUniverseCapabilities(5);

    expect(caps.superclusters.size).toBe(2);
    expect(repo).toHaveBeenCalledTimes(2);
  });

  it('una lectura que arrancó ANTES de la invalidación no repuebla la caché con el estado viejo', async () => {
    let release: (rows: unknown[]) => void = (_rows) => undefined;
    repo.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      })
    );

    const inFlight = getUniverseCapabilities(5);
    invalidateUniverseCapabilities(5); // la mutación se confirmó mientras la lectura seguía en vuelo
    release(ROWS); // ...y la lectura vieja termina después
    await inFlight;

    repo.mockResolvedValueOnce([]);
    const fresh = await getUniverseCapabilities(5);

    expect(fresh.superclusters.size).toBe(0);
    expect(repo).toHaveBeenCalledTimes(2);
  });
});
