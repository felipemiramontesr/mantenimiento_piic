import { z } from 'zod';

/**
 * FC 076 F4 — SSOT de schemas Zod compartidos entre apps/api y apps/web.
 * Opción B ACOTADA (convergencia Alfa v1.1, Cond.2 Bravo): SOLO las 3 rutas
 * cuyos contratos rompió y arregló este FC (R1/R4/R5) — no refactoriza el
 * 100% del backend. El schema vive en este único lugar; apps/api lo importa
 * 1:1 (Cond.1 Bravo, sin cambio semántico) y apps/web lo usa para validar,
 * en tests, que el payload real que construyen sus formularios pasa el
 * contrato real — no una copia que pueda desalinearse en silencio.
 */

/** PATCH /v1/auth/users/:id — auth.ts (R1: ArchonProfilePanel, R6: ProfileEditSlideOver) */
export const userUpdateSchema = z.object({
  data: z.object({
    fullName: z.string().optional(),
    department: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    roleId: z.number().int().optional(),
    profilePictureUrl: z.string().optional(),
    employeeNumber: z.string().optional(),
    departmentId: z.number().int().optional(),
    is_active: z.boolean().optional(),
  }),
  reason: z.string().min(5),
});

// FC 082 F0c — registerSchema eliminado: POST /v1/auth/register murió con las
// bandas de roles {1,3,4} (084_AN §1a); el alta renace en F3 (Contrato §C).

/** PUT /v1/routes/:uuid — fleetRoutes.ts (R5: handleCorrectActiveMission) */
export const routeUpdateSchema = z.object({
  data: z.record(z.any()),
  reason: z.string().min(5),
});

/**
 * FC 094 F4 — GET /v1/alerts, GET /v1/alerts/count (alerts.ts, Route→Service→
 * Repository piloted in F3). First RESPONSE-shape schema in this file (the
 * three above are request bodies) — same drift risk this package already
 * guards against, just checked in the other direction: apps/api's
 * `Alert`/`AlertType`/`AlertSeverity` (`alerts.calculators.ts`) and
 * apps/web's (`hooks/useAlerts.ts`, re-exported for its existing consumers)
 * both derive from this single definition instead of two hand-maintained
 * copies.
 */
export const alertTypeSchema = z.enum([
  'MAINTENANCE_OVERDUE',
  'INCIDENT_OPEN',
  'UNIT_CRITICAL',
  'COMPLIANCE_EXPIRY',
  'LEASE_PAYMENT_MISSING',
  'FINE_REGISTERED',
  'EXPENSE_ANOMALY',
]);
export type AlertType = z.infer<typeof alertTypeSchema>;

export const alertSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type AlertSeverity = z.infer<typeof alertSeveritySchema>;

export const alertSchema = z.object({
  id: z.string(),
  type: alertTypeSchema,
  severity: alertSeveritySchema,
  title: z.string(),
  description: z.string(),
  unitId: z.string(),
  createdAt: z.string(),
});
export type Alert = z.infer<typeof alertSchema>;

/** `hooks/useAlerts.ts` validates the unwrapped array from `useSilkHydration`
 * against this — keeps `zod` itself out of apps/web's direct dependencies. */
export const alertsArraySchema = z.array(alertSchema);

/** GET /v1/alerts/count response envelope. */
export const alertsCountResponseSchema = z.object({
  success: z.boolean(),
  count: z.number(),
});
