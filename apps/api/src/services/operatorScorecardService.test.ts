import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import OperatorScorecardService, {
  computeFuelEfficiencyScore,
  computeIncidentRateScore,
  computeCheckpointAdherenceScore,
  computeCompositeScore,
} from './operatorScorecardService';
import db from './db';

vi.mock('./db', () => ({
  default: { execute: vi.fn().mockResolvedValue([[], undefined]) },
}));

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

// ─── OperatorScorecardService.compute() — integración con DB ─────────────────
// Secuencia db.execute: (1) unitRows · (2) driverRows
// Si driver encontrado: Promise.all → (3) fuelRows · (4) incidentRows · (5) checkpointRows · (6) baselineRows

describe('OperatorScorecardService.compute()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('OS-SVC-1: unit not found → null', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]); // unitRows empty
    const result = await OperatorScorecardService.compute('unit-X');
    expect(result).toBeNull();
  });

  it('OS-SVC-2: unit found, sin conductor asignado → skeleton con nulls', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ ownerId: 5 }]]) // unitRows
      .mockResolvedValueOnce([[]]); // driverRows empty → no driver
    const result = await OperatorScorecardService.compute('unit-1');
    expect(result).not.toBeNull();
    expect(result!.driver_id).toBeNull();
    expect(result!.route_count).toBe(0);
    expect(result!.fuel_efficiency_score).toBeNull();
    expect(result!.incident_rate_score).toBeNull();
    expect(result!.checkpoint_adherence_score).toBeNull();
    expect(result!.composite_score).toBeNull();
  });

  it('OS-SVC-3: unit + driver → scorecard completo calculado', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ ownerId: 5 }]]) // unitRows
      .mockResolvedValueOnce([[{ driver_id: 10, route_count: 15 }]]) // driverRows
      .mockResolvedValueOnce([[{ driver_km_per_liter: '9.00' }]]) // fuelRows (Promise.all[0])
      .mockResolvedValueOnce([[{ total_routes: 15, routes_with_incidents: 1 }]]) // incidentRows [1]
      .mockResolvedValueOnce([[{ total_checkpoints: 30, visited_checkpoints: 27 }]]) // checkpointRows [2]
      .mockResolvedValueOnce([[{ km_per_liter: '10.00' }]]); // baselineRows [3]
    const result = await OperatorScorecardService.compute('unit-2');
    expect(result).not.toBeNull();
    expect(result!.driver_id).toBe(10);
    expect(result!.route_count).toBe(15);
    expect(result!.fuel_efficiency_score).toBe(90); // 9/10*100=90
    expect(result!.incident_rate_score).toBeCloseTo(93.33, 1); // (14/15)*100
    expect(result!.checkpoint_adherence_score).toBe(90); // 27/30*100=90
    expect(result!.composite_score).toBeCloseTo(91.11, 1); // (90+93.33+90)/3
  });

  it('OS-SVC-4: driver con datos nulos → scores parciales, composite desde datos válidos', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ ownerId: 5 }]])
      .mockResolvedValueOnce([[{ driver_id: 20, route_count: 8 }]])
      .mockResolvedValueOnce([[{ driver_km_per_liter: null }]]) // sin datos de combustible
      .mockResolvedValueOnce([[{ total_routes: 8, routes_with_incidents: 0 }]])
      .mockResolvedValueOnce([[{ total_checkpoints: 0, visited_checkpoints: 0 }]]) // sin checkpoints
      .mockResolvedValueOnce([[{ km_per_liter: null }]]); // sin baseline
    const result = await OperatorScorecardService.compute('unit-3');
    expect(result!.fuel_efficiency_score).toBeNull(); // sin baseline
    expect(result!.incident_rate_score).toBe(100); // 0 incidentes en 8 rutas
    expect(result!.checkpoint_adherence_score).toBeNull(); // 0 checkpoints
    expect(result!.composite_score).toBe(100); // único válido = 100
  });

  it('OS-SVC-5: incidentRows vacío + checkpointRows vacío → 4 ternary false branches (B146/147/150/153)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ ownerId: 5 }]])
      .mockResolvedValueOnce([[{ driver_id: 30, route_count: 5 }]])
      .mockResolvedValueOnce([[{ driver_km_per_liter: '8.00' }]])
      .mockResolvedValueOnce([[]]) // incidentRows vacío → incidentRows[0]=undefined → B146[0]+B147[0]
      .mockResolvedValueOnce([[]]) // checkpointRows vacío → checkpointRows[0]=undefined → B150[0]+B153[0]
      .mockResolvedValueOnce([[{ km_per_liter: '10.00' }]]);
    const result = await OperatorScorecardService.compute('unit-5');
    expect(result).not.toBeNull();
    expect(result!.driver_id).toBe(30);
    expect(result!.incident_rate_score).toBeNull(); // totalRoutes=0 → null
    expect(result!.checkpoint_adherence_score).toBeNull(); // totalCheckpoints=0 → null
    expect(result!.fuel_efficiency_score).toBe(80); // 8/10*100=80
    expect(result!.composite_score).toBe(80); // único válido=80
  });
});
