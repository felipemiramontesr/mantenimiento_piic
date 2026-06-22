/**
 * FaseA seeding data definitions — FC DataResilience_NHTSAIntegration
 * Exported separately so tests can import without DB/env dependencies.
 */

export const SEED_A_TAG = 'SEED_A';
export const SEED_A_OWNER_ID = 9045;

export interface ScheduleEntry {
  days: number;
  km: number;
  liters: number;
  driverId: number;
}

export interface MakeScheduleOptions {
  intervalDays?: number;
  blackout?: { fromDay: number; toDay: number };
  stopAtDay?: number;
  overrides?: Array<{ index: number; km: number; liters: number; driverId?: number }>;
  driverRotation?: number[];
}

export function makeSchedule(
  count: number,
  kmPerRoute: number,
  litersPerRoute: number,
  driverId: number,
  options?: MakeScheduleOptions
): ScheduleEntry[] {
  const intervalDays = options?.intervalDays ?? 6;
  const schedule: ScheduleEntry[] = [];
  let day = 0;
  let inserted = 0;

  while (inserted < count) {
    day += intervalDays;
    const pastStopDay = options?.stopAtDay !== undefined && day > options.stopAtDay;
    const inBlackout =
      options?.blackout !== undefined &&
      day >= options.blackout.fromDay &&
      day <= options.blackout.toDay;

    if (!pastStopDay && !inBlackout) {
      const idx = inserted;
      const override = options?.overrides?.find((o) => o.index === idx);
      const rotationLen = options?.driverRotation?.length ?? 0;
      const rotationDriver =
        rotationLen > 0
          ? options!.driverRotation![Math.floor(idx / Math.ceil(count / rotationLen)) % rotationLen]
          : driverId;

      schedule.push({
        days: day,
        km: override?.km ?? kmPerRoute,
        liters: override?.liters ?? litersPerRoute,
        driverId: override?.driverId ?? rotationDriver,
      });
      inserted += 1;
    } else if (pastStopDay) {
      break;
    }
  }
  return schedule;
}

// Jun 2025 = day 0. Offsets in days from 2025-06-03.
// "recent" for anomaly detection = last 90 days from Jun 2026 ≈ day ≥ 270 (Mar 2026)

export const PIIC101_SCHEDULE = makeSchedule(60, 300, 35, 101, {
  overrides: [{ index: 58, km: 200, liters: 250 }], // EC-1: fuel theft signal (0.8 km/L)
});

export const PIIC201_SCHEDULE = makeSchedule(57, 250, 30, 201, {
  blackout: { fromDay: 196, toDay: 270 }, // EC-3: Jan 15 – Mar 1 gap
  driverRotation: [201, 202, 203, 204], // EC-1: 4 different drivers
});

export const PIIC202_SCHEDULE = makeSchedule(60, 280, 32, 202, {
  overrides: [{ index: 53, km: 500, liters: 200 }], // EC-3: CO₂ spike
});

// EC-1: dormant — stopAtDay 293 ≈ Mar 17 2026 (91+ days before Jun 2026)
export const PIIC301_SCHEDULE = makeSchedule(60, 200, 25, 301, { stopAtDay: 293 });

export const PIIC302_SCHEDULE = makeSchedule(60, 400, 28, 302); // EC-1: star performer 14.29 km/L

export const PIIC303_SCHEDULE = makeSchedule(60, 250, 30, 303);

// FaseF seeding units — same brandId=23 modelId=525 year=2020 as PIIC-303
export const PIIC304_SCHEDULE = makeSchedule(60, 250, 30, 304);
export const PIIC305_SCHEDULE = makeSchedule(60, 250, 30, 305);
