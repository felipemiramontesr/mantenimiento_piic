import { describe, it, expect } from 'vitest';
import {
  computeFuelEfficiencyScore,
  computeIncidentRateScore,
  computeCheckpointAdherenceScore,
  computeCompositeScore,
} from './operatorScorecardService';

describe('computeFuelEfficiencyScore', () => {
  it('OS-PURE-1: conductor igual al baseline → 100', () => {
    expect(computeFuelEfficiencyScore(10, 10)).toBe(100);
  });

  it('OS-PURE-2: conductor 20% mejor que baseline → capped a 100', () => {
    expect(computeFuelEfficiencyScore(12, 10)).toBe(100);
  });

  it('OS-PURE-3: conductor 25% peor que baseline → 75', () => {
    expect(computeFuelEfficiencyScore(7.5, 10)).toBe(75);
  });

  it('OS-PURE-4: baseline = 0 → null (evita división por cero)', () => {
    expect(computeFuelEfficiencyScore(10, 0)).toBeNull();
  });
});

describe('computeIncidentRateScore', () => {
  it('OS-PURE-5: 0 incidentes en 10 rutas → 100', () => {
    expect(computeIncidentRateScore(10, 0)).toBe(100);
  });

  it('OS-PURE-6: 1 incidente en 10 rutas → 90', () => {
    expect(computeIncidentRateScore(10, 1)).toBe(90);
  });

  it('OS-PURE-7: todos los viajes con incidente → 0', () => {
    expect(computeIncidentRateScore(5, 5)).toBe(0);
  });

  it('OS-PURE-8: 0 rutas → null', () => {
    expect(computeIncidentRateScore(0, 0)).toBeNull();
  });
});

describe('computeCheckpointAdherenceScore', () => {
  it('OS-PURE-9: todos los checkpoints visitados → 100', () => {
    expect(computeCheckpointAdherenceScore(10, 10)).toBe(100);
  });

  it('OS-PURE-10: la mitad visitados → 50', () => {
    expect(computeCheckpointAdherenceScore(10, 5)).toBe(50);
  });

  it('OS-PURE-11: 0 checkpoints → null (sin checkpoints en las rutas)', () => {
    expect(computeCheckpointAdherenceScore(0, 0)).toBeNull();
  });
});

describe('computeCompositeScore', () => {
  it('OS-PURE-12: promedio de tres scores → (90+80+100)/3 ≈ 90', () => {
    expect(computeCompositeScore([90, 80, 100])).toBeCloseTo(90, 1);
  });

  it('OS-PURE-13: ignora nulls al promediar → (80+100)/2 = 90', () => {
    expect(computeCompositeScore([null, 80, 100])).toBe(90);
  });

  it('OS-PURE-14: todos nulls → null', () => {
    expect(computeCompositeScore([null, null, null])).toBeNull();
  });

  it('OS-PURE-15: un solo score → ese mismo valor', () => {
    expect(computeCompositeScore([75])).toBe(75);
  });
});
