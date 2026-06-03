/**
 * Archon Status Constants — single source of truth for all status string values.
 * Covers fleet_units.status (Spanish UI values) and fleet_movements.status (English system values).
 */

export const UNIT_STATUS = {
  AVAILABLE: 'Disponible',
  IN_ROUTE: 'En Ruta',
  MAINTENANCE: 'En Mantenimiento',
  DISCONTINUED: 'Descontinuada',
  ASSIGNED: 'Asignada',
} as const;

export type UnitStatusValue = (typeof UNIT_STATUS)[keyof typeof UNIT_STATUS];

export const MOVEMENT_STATUS = {
  OPEN: 'OPEN',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type MovementStatusValue = (typeof MOVEMENT_STATUS)[keyof typeof MOVEMENT_STATUS];

export const MOVEMENT_TYPE = {
  ROUTE: 'ROUTE',
  MAINTENANCE: 'MAINTENANCE',
} as const;

export const INCIDENT_STATUS = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
} as const;
