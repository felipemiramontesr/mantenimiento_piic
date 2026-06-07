import { describe, it, expect } from 'vitest';
import {
  validateVehicleProfile,
  getActivePackageLevels,
  getTasksForPackage,
  deduplicateCascade,
  getTriageTasks,
  getMinorServiceTasks,
  getStage4Tasks,
  checkStage5Timeout,
  calculateUpaOrder,
  DEFAULT_BUSINESS_HOURS,
  type VehicleProfile,
  type WorkOrder,
  type HistoricalTask,
} from './upaEngine';

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — Hard Stop Validation (Regla 4 / FC-4)
// ─────────────────────────────────────────────────────────────────────────────
describe('validateVehicleProfile — Hard Stop', () => {
  const valid: VehicleProfile = {
    brand: 'toyota',
    fuelType: 'diesel',
    fleetType: 'mining',
    odometer: 30000,
  };

  it('passes a complete profile', () => {
    expect(validateVehicleProfile(valid)).toEqual([]);
  });

  it('rejects missing brand', () => {
    const errors = validateVehicleProfile({ ...valid, brand: undefined as never });
    expect(errors).toContain('brand is required');
  });

  it('rejects missing fuelType', () => {
    const errors = validateVehicleProfile({ ...valid, fuelType: undefined as never });
    expect(errors).toContain('fuelType is required');
  });

  it('rejects missing fleetType (FC-4 hard stop)', () => {
    const errors = validateVehicleProfile({ ...valid, fleetType: undefined as never });
    expect(errors).toContain('fleetType is required');
  });

  it('rejects missing odometer', () => {
    const errors = validateVehicleProfile({ ...valid, odometer: undefined as never });
    expect(errors).toContain('odometer is required');
  });

  it('rejects negative odometer', () => {
    const errors = validateVehicleProfile({ ...valid, odometer: -1 });
    expect(errors).toContain('odometer must be >= 0');
  });

  it('returns empty tasks and lists errors in calculateUpaOrder when profile invalid', () => {
    const result = calculateUpaOrder({
      vehicleProfile: {
        brand: undefined as never,
        fuelType: 'gasoline',
        fleetType: 'urban',
        odometer: 10000,
      },
      lastClosedWorkOrder: null,
    });
    expect(result.tasks).toHaveLength(0);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — Cascade Math: getActivePackageLevels (Regla 3)
// ─────────────────────────────────────────────────────────────────────────────
describe('getActivePackageLevels — symmetric ±1500 km tolerance', () => {
  it.each([
    // === NO CASCADE ===
    [0, []],
    [4500, []],
    [5000, []],
    [8499, []], // 1 km below lower bound of 10k window
    [11501, []], // 1 km above upper bound of 10k window
    [15000, []], // midpoint between 10k and 20k
    [21501, []],
    [25000, []],
    [31501, []],
    [35000, []],
    [41501, []],
    [45000, []],
    [51501, []],
    // === 10k ONLY ===
    [8500, ['10k']], // lower bound
    [10000, ['10k']], // nominal
    [11500, ['10k']], // upper bound
    // === 10k + 20k (accumulative) ===
    [18500, ['10k', '20k']],
    [20000, ['10k', '20k']],
    [21500, ['10k', '20k']],
    // === 10k + 20k + 30k ===
    [28500, ['10k', '20k', '30k']],
    [30000, ['10k', '20k', '30k']],
    [31500, ['10k', '20k', '30k']],
    // === 40k milestone → still A+B+C (30k level) ===
    [38500, ['10k', '20k', '30k']],
    [40000, ['10k', '20k', '30k']],
    [41500, ['10k', '20k', '30k']],
    // === 50k milestone → full A+B+C+D ===
    [48500, ['10k', '20k', '30k', '50k']],
    [50000, ['10k', '20k', '30k', '50k']],
    [51500, ['10k', '20k', '30k', '50k']],
    // === 60k milestone → same as 50k level ===
    [58500, ['10k', '20k', '30k', '50k']],
    [60000, ['10k', '20k', '30k', '50k']],
    [61500, ['10k', '20k', '30k', '50k']],
    // === 70k milestone → new cycle begins at 10k ===
    [68500, ['10k']],
    [70000, ['10k']],
  ] as [number, string[]][])('odometer %i km → %j', (odometer, expected) => {
    expect(getActivePackageLevels(odometer)).toEqual(expected);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — Task injection per package level
// ─────────────────────────────────────────────────────────────────────────────
describe('getTasksForPackage — package injection', () => {
  it('Package A (10k) generic injects 8 base tasks', () => {
    const tasks = getTasksForPackage('10k', 'generic', 'diesel');
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('cascade_tire_rotation');
    expect(ids).toContain('cascade_exterior_wash');
    expect(tasks.filter((t) => t.packageLevel === '10k')).toHaveLength(8);
  });

  it('Package A (10k) toyota adds 2 brand tasks', () => {
    const tasks = getTasksForPackage('10k', 'toyota', 'diesel');
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('cascade_toyota_10k_pedals');
    expect(ids).toContain('cascade_toyota_10k_hinges');
    expect(tasks.filter((t) => t.packageLevel === '10k')).toHaveLength(10);
  });

  it('Package A (10k) kia adds 1 brand task', () => {
    const tasks = getTasksForPackage('10k', 'kia', 'gasoline');
    expect(tasks.map((t) => t.id)).toContain('cascade_kia_10k_idle');
    expect(tasks.filter((t) => t.packageLevel === '10k')).toHaveLength(9);
  });

  it('Package A (10k) nissan adds no brand tasks', () => {
    const tasks = getTasksForPackage('10k', 'nissan', 'diesel');
    expect(tasks.filter((t) => t.packageLevel === '10k')).toHaveLength(8);
  });

  it('Package A (10k) mitsubishi adds 2 brand tasks', () => {
    const tasks = getTasksForPackage('10k', 'mitsubishi', 'diesel');
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('cascade_mitsubishi_10k_cv_boots');
    expect(ids).toContain('cascade_mitsubishi_10k_vacuum_hoses');
  });

  it('Package A (10k) dodge_ram adds 2 brand tasks', () => {
    const tasks = getTasksForPackage('10k', 'dodge_ram', 'gasoline');
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('cascade_dodge_10k_frame');
    expect(ids).toContain('cascade_dodge_10k_leaf_springs');
  });

  it('Package B (20k) injects 8 base + nissan brand tasks', () => {
    const tasks = getTasksForPackage('20k', 'nissan', 'diesel');
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('cascade_front_brake_pads');
    expect(ids).toContain('cascade_nissan_20k_airbag_sensors');
    expect(ids).toContain('cascade_nissan_20k_seat_anchors');
  });

  it('Package C (30k) diesel skips spark plug tasks', () => {
    const tasks = getTasksForPackage('30k', 'generic', 'diesel');
    const ids = tasks.map((t) => t.id);
    expect(ids).not.toContain('cascade_spark_plugs_remove');
    expect(ids).not.toContain('cascade_spark_plugs_install');
    expect(ids).toContain('cascade_injector_clean');
  });

  it('Package C (30k) gasoline includes spark plug tasks', () => {
    const tasks = getTasksForPackage('30k', 'generic', 'gasoline');
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('cascade_spark_plugs_remove');
    expect(ids).toContain('cascade_spark_plugs_install');
  });

  it('Package C (30k) toyota adds steering column and injector rail tasks', () => {
    const tasks = getTasksForPackage('30k', 'toyota', 'gasoline');
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('cascade_toyota_30k_steering_column');
    expect(ids).toContain('cascade_toyota_30k_injector_rail');
  });

  it('Package D (50k) injects 10 base tasks', () => {
    const tasks = getTasksForPackage('50k', 'generic', 'diesel');
    expect(tasks.filter((t) => t.packageLevel === '50k')).toHaveLength(10);
    expect(tasks.map((t) => t.id)).toContain('cascade_coolant_drain');
  });

  it('Package D (50k) toyota adds 4x4 and front driveshaft tasks', () => {
    const tasks = getTasksForPackage('50k', 'toyota', 'diesel');
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('cascade_toyota_50k_4wd_actuator');
    expect(ids).toContain('cascade_toyota_50k_front_driveshaft');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4 — Deduplication (FC-1)
// ─────────────────────────────────────────────────────────────────────────────
describe('deduplicateCascade — FC-1 last closed WO lookup', () => {
  const pkgA10k = getTasksForPackage('10k', 'generic', 'diesel');

  const makeWO = (tasks: HistoricalTask[]): WorkOrder => ({
    id: 'wo-001',
    closedAt: new Date('2026-01-01'),
    tasks,
  });

  it('returns all tasks when lastClosedWorkOrder is null', () => {
    expect(deduplicateCascade(pkgA10k, null)).toHaveLength(pkgA10k.length);
  });

  it('purges tasks executed in the last WO (Scenario 2)', () => {
    const previousTasks: HistoricalTask[] = pkgA10k.map((t) => ({
      taskId: t.id,
      executed: true,
    }));
    const result = deduplicateCascade(pkgA10k, makeWO(previousTasks));
    expect(result).toHaveLength(0);
  });

  it('does NOT purge tasks that were DEFERRED_FINANCIAL in last WO', () => {
    const previousTasks: HistoricalTask[] = pkgA10k.map((t) => ({
      taskId: t.id,
      executed: false,
      deferredType: 'DEFERRED_FINANCIAL' as const,
    }));
    const result = deduplicateCascade(pkgA10k, makeWO(previousTasks));
    expect(result).toHaveLength(pkgA10k.length);
  });

  it('does NOT purge tasks that were N_A_STRUCTURAL in last WO', () => {
    const previousTasks: HistoricalTask[] = pkgA10k.map((t) => ({
      taskId: t.id,
      executed: false,
      deferredType: 'N_A_STRUCTURAL' as const,
    }));
    const result = deduplicateCascade(pkgA10k, makeWO(previousTasks));
    expect(result).toHaveLength(pkgA10k.length);
  });

  it('purges only the tasks present in last WO, leaves new-level tasks intact', () => {
    // Simulate: 10k tasks were done last cycle, now at 20k → only Pkg B should remain
    const pkgA = getTasksForPackage('10k', 'generic', 'diesel');
    const pkgB = getTasksForPackage('20k', 'generic', 'diesel');
    const allCascade = [...pkgA, ...pkgB];

    const previousTasks: HistoricalTask[] = pkgA.map((t) => ({ taskId: t.id, executed: true }));
    const result = deduplicateCascade(allCascade, makeWO(previousTasks));

    const resultIds = result.map((t) => t.id);
    pkgA.forEach((t) => expect(resultIds).not.toContain(t.id));
    pkgB.forEach((t) => expect(resultIds).toContain(t.id));
  });

  it('purges brand rules along with base tasks when all were executed', () => {
    const pkgAToyota = getTasksForPackage('10k', 'toyota', 'diesel');
    const previousTasks: HistoricalTask[] = pkgAToyota.map((t) => ({
      taskId: t.id,
      executed: true,
    }));
    const result = deduplicateCascade(pkgAToyota, makeWO(previousTasks));
    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5 — Stage 1 Triage: mining context (FC-4)
// ─────────────────────────────────────────────────────────────────────────────
describe('getTriageTasks — fleet_type determines mining tasks', () => {
  const MINING_TASK_IDS = [
    'triage_rotating_beacon',
    'triage_safety_pole',
    'triage_extinguisher',
    'triage_wheel_chocks',
    'triage_strobe',
    'triage_reverse_alarm',
    'triage_reflective_tape',
  ];

  it('urban fleet: 27 universal tasks, no mining tasks', () => {
    const tasks = getTriageTasks('urban');
    expect(tasks).toHaveLength(27);
    MINING_TASK_IDS.forEach((id) => {
      expect(tasks.map((t) => t.id)).not.toContain(id);
    });
  });

  it('mining fleet: 34 tasks (27 universal + 7 mining)', () => {
    const tasks = getTriageTasks('mining');
    expect(tasks).toHaveLength(34);
    MINING_TASK_IDS.forEach((id) => {
      expect(tasks.map((t) => t.id)).toContain(id);
    });
  });

  it('urban and mining share the same universal tasks', () => {
    const urban = getTriageTasks('urban').map((t) => t.id);
    const mining = getTriageTasks('mining').map((t) => t.id);
    urban.forEach((id) => expect(mining).toContain(id));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 6 — Stage 2 Minor Service: fuel type branching
// ─────────────────────────────────────────────────────────────────────────────
describe('getMinorServiceTasks — fuel type determines filter task', () => {
  it('gasoline: 6 tasks including cabin filter, not water separator', () => {
    const tasks = getMinorServiceTasks('gasoline');
    const ids = tasks.map((t) => t.id);
    expect(tasks).toHaveLength(6);
    expect(ids).toContain('minor_cabin_filter');
    expect(ids).not.toContain('minor_water_separator');
  });

  it('diesel: 6 tasks including water separator, not cabin filter', () => {
    const tasks = getMinorServiceTasks('diesel');
    const ids = tasks.map((t) => t.id);
    expect(tasks).toHaveLength(6);
    expect(ids).toContain('minor_water_separator');
    expect(ids).not.toContain('minor_cabin_filter');
  });

  it('both fuel types share the same 5 base tasks', () => {
    const gasoline = getMinorServiceTasks('gasoline').map((t) => t.id);
    const diesel = getMinorServiceTasks('diesel').map((t) => t.id);
    const shared = [
      'minor_oil_drain',
      'minor_oil_fill',
      'minor_oil_filter',
      'minor_air_filter',
      'minor_fuel_filter',
    ];
    shared.forEach((id) => {
      expect(gasoline).toContain(id);
      expect(diesel).toContain(id);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 7 — Stage 4: deferred history filtering (Regla 5 / FC-2)
// ─────────────────────────────────────────────────────────────────────────────
describe('getStage4Tasks — DEFERRED_FINANCIAL vs N_A_STRUCTURAL', () => {
  const makeWOWithDeferred = (tasks: HistoricalTask[]): WorkOrder => ({
    id: 'wo-002',
    closedAt: new Date('2026-01-01'),
    tasks,
  });

  it('returns empty array when no history', () => {
    expect(getStage4Tasks(null)).toHaveLength(0);
  });

  it('returns empty array when all historical tasks were executed', () => {
    const wo = makeWOWithDeferred([{ taskId: 'cascade_tire_rotation', executed: true }]);
    expect(getStage4Tasks(wo)).toHaveLength(0);
  });

  it('returns only DEFERRED_FINANCIAL tasks (Scenario 4)', () => {
    const wo = makeWOWithDeferred([
      { taskId: 'cascade_tire_rotation', executed: false, deferredType: 'DEFERRED_FINANCIAL' },
      { taskId: 'cascade_rear_drums', executed: false, deferredType: 'N_A_STRUCTURAL' },
    ]);
    const result = getStage4Tasks(wo);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('deferred_cascade_tire_rotation');
    expect(result[0].stage).toBe('deferred');
  });

  it('N_A_STRUCTURAL tasks are permanently hidden from Stage 4', () => {
    const wo = makeWOWithDeferred([
      { taskId: 'cascade_rear_drums', executed: false, deferredType: 'N_A_STRUCTURAL' },
      { taskId: 'cascade_radiator_hoses', executed: false, deferredType: 'N_A_STRUCTURAL' },
    ]);
    expect(getStage4Tasks(wo)).toHaveLength(0);
  });

  it('multiple DEFERRED_FINANCIAL tasks are all returned', () => {
    const wo = makeWOWithDeferred([
      { taskId: 'cascade_injector_clean', executed: false, deferredType: 'DEFERRED_FINANCIAL' },
      { taskId: 'cascade_spark_plugs_remove', executed: false, deferredType: 'DEFERRED_FINANCIAL' },
      { taskId: 'cascade_rear_drums', executed: false, deferredType: 'N_A_STRUCTURAL' },
    ]);
    const result = getStage4Tasks(wo);
    expect(result).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 8 — Stage 5 timeout: pure function (Regla 7 / FC-3)
// ─────────────────────────────────────────────────────────────────────────────
describe('checkStage5Timeout — 24 business hours (Regla 7)', () => {
  const mon = (h: number): Date => new Date(2026, 5, 1, h, 0, 0); // Monday 2026-06-01
  const wed = (h: number): Date => new Date(2026, 5, 3, h, 0, 0); // Wednesday
  const thu = (h: number): Date => new Date(2026, 5, 4, h, 0, 0); // Thursday
  const fri = (h: number): Date => new Date(2026, 5, 5, h, 0, 0); // Friday
  const mon2 = (h: number): Date => new Date(2026, 5, 8, h, 0, 0); // Monday next week

  it('returns false when only 12 business hours have passed (same weekday)', () => {
    // Mon 8am → Mon 8pm: 10 business hours (8-18)
    expect(checkStage5Timeout(mon(8), mon(20), DEFAULT_BUSINESS_HOURS)).toBe(false);
  });

  it('returns false when 20 business hours have passed', () => {
    // Mon 8am → Tue 10am: Mon 8-18 (10h) + Tue 8-10 (2h) = 12h
    // Mon 8am → Wed 8am: Mon 10h + Tue 10h = 20h → false
    expect(checkStage5Timeout(mon(8), wed(8), DEFAULT_BUSINESS_HOURS)).toBe(false);
  });

  it('returns true when exactly 24 business hours have passed', () => {
    // Mon 8am → Wed 12pm: Mon 10h + Tue 10h + Wed 4h = 24h
    expect(checkStage5Timeout(mon(8), wed(12), DEFAULT_BUSINESS_HOURS)).toBe(true);
  });

  it('returns true when more than 24 business hours have passed', () => {
    // Mon 8am → Thu 10am: Mon 10h + Tue 10h + Wed 10h + Thu 2h = 32h
    expect(checkStage5Timeout(mon(8), thu(10), DEFAULT_BUSINESS_HOURS)).toBe(true);
  });

  it('does not count Saturday or Sunday hours', () => {
    // Fri 10am → Mon 10am: Fri 10-18 (8h) + Sat/Sun (0h) + Mon 8-10 (2h) = 10h
    expect(checkStage5Timeout(fri(10), mon2(10), DEFAULT_BUSINESS_HOURS)).toBe(false);
  });

  it('correctly spans weekend: Thu + Fri + Mon cross 24h', () => {
    // Thu 10am → Mon 10am: Thu 10-18 (8h) + Fri 8-18 (10h) + Mon 8-10 (2h) = 20h → false
    expect(checkStage5Timeout(thu(10), mon2(10), DEFAULT_BUSINESS_HOURS)).toBe(false);
  });

  it('longer weekend span does reach 24h: Wed + Thu + Fri + Mon', () => {
    // Wed 16h → Mon 10am: Wed 16-18 (2h) + Thu 8-18 (10h) + Fri 8-18 (10h) + Mon 8-10 (2h) = 24h
    const wedLate = new Date(2026, 5, 3, 16, 0, 0);
    expect(checkStage5Timeout(wedLate, mon2(10), DEFAULT_BUSINESS_HOURS)).toBe(true);
  });

  it('returns false before business hours start (night hours not counted)', () => {
    // Mon 2am → Mon 6am: 0 business hours
    expect(checkStage5Timeout(mon(2), mon(6), DEFAULT_BUSINESS_HOURS)).toBe(false);
  });

  it('accepts a custom business hours config', () => {
    const config = { startHour: 9, endHour: 17, workdays: [1, 2, 3, 4, 5] };
    // With 8h/day: need 3 full days to reach 24h
    // Mon 9am → Thu 9am: Mon 8h + Tue 8h + Wed 8h = 24h
    expect(
      checkStage5Timeout(new Date(2026, 5, 1, 9, 0, 0), new Date(2026, 5, 4, 9, 0, 0), config)
    ).toBe(true);
  });

  it('returns false with same pendingSince and now', () => {
    expect(checkStage5Timeout(mon(10), mon(10), DEFAULT_BUSINESS_HOURS)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION — calculateUpaOrder (Feature Contract Scenarios 1-4)
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateUpaOrder — Acceptance Criteria', () => {
  it('Scenario 1: 11,400 km triggers Paquete Básico (10k)', () => {
    const result = calculateUpaOrder({
      vehicleProfile: { brand: 'generic', fuelType: 'diesel', fleetType: 'urban', odometer: 11400 },
      lastClosedWorkOrder: null,
    });
    const cascadeIds = result.tasks.filter((t) => t.stage === 'cascade').map((t) => t.id);
    expect(cascadeIds).toContain('cascade_tire_rotation');
    expect(cascadeIds).toContain('cascade_exterior_wash');
    cascadeIds.forEach((id) =>
      expect(id).not.toMatch(/^cascade_(front_brake|radiator|serpentine)/)
    );
  });

  it('Scenario 2: 21,400 km with 10k tasks in last WO → 10k purged, 20k injected', () => {
    const pkgA = getTasksForPackage('10k', 'generic', 'diesel');
    const lastWO: WorkOrder = {
      id: 'wo-prev',
      closedAt: new Date('2026-01-01'),
      tasks: pkgA.map((t) => ({ taskId: t.id, executed: true })),
    };
    const result = calculateUpaOrder({
      vehicleProfile: { brand: 'generic', fuelType: 'diesel', fleetType: 'urban', odometer: 21400 },
      lastClosedWorkOrder: lastWO,
    });
    const cascadeIds = result.tasks.filter((t) => t.stage === 'cascade').map((t) => t.id);
    expect(cascadeIds).not.toContain('cascade_tire_rotation'); // 10k — purged
    expect(cascadeIds).not.toContain('cascade_exterior_wash'); // 10k — purged
    expect(cascadeIds).toContain('cascade_front_brake_pads'); // 20k — injected
  });

  it('Scenario 3: missing fleet_type → Hard Stop, Validation Error', () => {
    const result = calculateUpaOrder({
      vehicleProfile: {
        brand: 'toyota',
        fuelType: 'diesel',
        fleetType: undefined as never,
        odometer: 10000,
      },
      lastClosedWorkOrder: null,
    });
    expect(result.tasks).toHaveLength(0);
    expect(result.validationErrors).toContain('fleetType is required');
  });

  it('Scenario 4: Stage 4 returns only DEFERRED_FINANCIAL, not N_A_STRUCTURAL', () => {
    const lastWO: WorkOrder = {
      id: 'wo-deferred',
      closedAt: new Date('2026-01-01'),
      tasks: [
        { taskId: 'cascade_tire_rotation', executed: false, deferredType: 'DEFERRED_FINANCIAL' },
        { taskId: 'cascade_rear_drums', executed: false, deferredType: 'N_A_STRUCTURAL' },
      ],
    };
    const result = calculateUpaOrder({
      vehicleProfile: {
        brand: 'generic',
        fuelType: 'gasoline',
        fleetType: 'urban',
        odometer: 5000,
      },
      lastClosedWorkOrder: lastWO,
    });
    const deferredTasks = result.tasks.filter((t) => t.stage === 'deferred');
    expect(deferredTasks).toHaveLength(1);
    expect(deferredTasks[0].id).toBe('deferred_cascade_tire_rotation');
  });

  it('mining vehicle at 30k includes all 34 triage tasks + full cascade A+B+C', () => {
    const result = calculateUpaOrder({
      vehicleProfile: { brand: 'toyota', fuelType: 'diesel', fleetType: 'mining', odometer: 30000 },
      lastClosedWorkOrder: null,
    });
    const triage = result.tasks.filter((t) => t.stage === 'triage');
    expect(triage).toHaveLength(34);
    const cascade = result.tasks.filter((t) => t.stage === 'cascade');
    const cascadeIds = cascade.map((t) => t.id);
    // A (10k)
    expect(cascadeIds).toContain('cascade_tire_rotation');
    expect(cascadeIds).toContain('cascade_toyota_10k_pedals');
    // B (20k)
    expect(cascadeIds).toContain('cascade_front_brake_pads');
    expect(cascadeIds).toContain('cascade_toyota_20k_throttle_cable');
    // C (30k) — diesel, no spark plugs
    expect(cascadeIds).toContain('cascade_injector_clean');
    expect(cascadeIds).not.toContain('cascade_spark_plugs_remove');
    expect(cascadeIds).toContain('cascade_toyota_30k_steering_column');
    // D (50k) — should NOT be present at 30k
    expect(cascadeIds).not.toContain('cascade_coolant_drain');
  });

  it('returns zero validation errors and non-empty tasks for a valid profile', () => {
    const result = calculateUpaOrder({
      vehicleProfile: {
        brand: 'nissan',
        fuelType: 'gasoline',
        fleetType: 'urban',
        odometer: 20000,
      },
      lastClosedWorkOrder: null,
    });
    expect(result.validationErrors).toHaveLength(0);
    expect(result.tasks.length).toBeGreaterThan(0);
  });
});
