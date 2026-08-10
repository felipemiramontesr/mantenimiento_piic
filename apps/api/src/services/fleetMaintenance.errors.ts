/**
 * FC156 F1 — typed error thrown by `fleetMaintenance.service.ts`, caught in
 * `routes/fleetMaintenance.ts` and mapped to its pre-migration HTTP
 * status/body (same shape as before the Route→Service→Repository split —
 * Inv-E). Used only by the `accept`/`reject` endpoints, whose pre-migration
 * code already distinguished not-found (404) from wrong-status (409) inline
 * — `intake`/`complete` funnel every thrown error to 400 and keep using
 * plain `Error`/`CatalogMappingError`, preserved as-is (Cond.R-156-M5).
 */
export type FleetMaintenanceErrorCode = 'NOT_FOUND' | 'CONFLICT';

/** Discriminated error thrown by `fleetMaintenance.service.ts` — see `FleetMaintenanceErrorCode`. */
export class FleetMaintenanceServiceError extends Error {
  constructor(public readonly code: FleetMaintenanceErrorCode, message: string) {
    super(message);
    this.name = 'FleetMaintenanceServiceError';
  }
}
