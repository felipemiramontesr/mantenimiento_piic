/**
 * Archon Maintenance Engine Constants — canonical numeric values for the fleet service cycle.
 * Source of truth for computeServiceType and all maintenance scheduling logic.
 * Mirror in: apps/web/src/components/Maintenance/MaintenanceRegistrationForm.tsx
 */

// eslint-disable-next-line import/prefer-default-export
export const MAINTENANCE = {
  CYCLE_KM: 60000,

  MINE_UNIT_INTERVAL_KM: 5000,
  AGENCY_DEFAULT_INTERVAL_KM: 10000,

  TOLERANCE_KM: 1000,

  WINDOWS: {
    ADVANCED_50K: { low: 49000, high: 51000 },
    MAJOR_30K: { low: 29000, high: 41000 },
    INTERMEDIATE_20K: { low: 19000, high: 21000 },
    BASIC_10K: { low: 9000, high: 11000 },
  },

  MILESTONES: [
    { type: 'BASIC_10K' as const, value: 10000 },
    { type: 'INTERMEDIATE_20K' as const, value: 20000 },
    { type: 'MAJOR_30K' as const, value: 30000 },
    { type: 'MAJOR_30K' as const, value: 40000 },
    { type: 'ADVANCED_50K' as const, value: 50000 },
  ],

  PREDICTIVE_ALERTS: {
    CHASSIS_INSPECTION_KM: 80000,
    DISTRIBUTION_KIT_KM: 100000,
  },
} as const;
