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

/**
 * FC 142 F1 — 8 schemas para los data-fetching hooks de `FleetUnitNode.tsx`
 * (Cond.R-142-H1), que hacían `api.get` crudo sin validar el shape real de
 * respuesta. Cada schema fue verificado contra el `reply.send(...)` real de
 * su ruta en `apps/api/src/routes/` antes de escribirse (Gatekeeper Lógico,
 * Cond.R-142-S3) — no son DTOs inventados.
 */

/** GET /v1/fleet-units/:unitId/intelligence — fleetIntelligence.ts */
export const fleetIntelligenceDataSchema = z.object({
  oee: z.number().nullable(),
  tco_per_km: z.number().nullable(),
  km_per_liter: z.number().nullable(),
  pm_compliance: z.number().nullable(),
  backlog_aging_days: z.number().nullable(),
});
export const fleetIntelligenceResponseSchema = z.object({
  success: z.boolean(),
  data: fleetIntelligenceDataSchema,
});
export type FleetIntelligenceData = z.infer<typeof fleetIntelligenceDataSchema>;

/** GET /v1/fleet-units/:unitId/economic-life — economicLife.ts */
export const economicLifeDataSchema = z.object({
  residual_value_mxn: z.number().nullable(),
  accumulated_tco: z.number().nullable(),
  replacement_score: z.number().nullable(),
  recommendation: z.enum(['KEEP', 'EVALUATE', 'REPLACE']).nullable(),
});
export const economicLifeResponseSchema = z.object({
  success: z.boolean(),
  data: economicLifeDataSchema,
});
export type EconomicLifeData = z.infer<typeof economicLifeDataSchema>;

/** GET /v1/fleet-units/:unitId/anomalies — anomalyDetection.ts */
export const anomalyDetectionDataSchema = z.object({
  fleet_size: z.number().nullable(),
  algorithm: z.string().nullable(),
  unit_km_per_liter: z.number().nullable(),
  baseline_km_per_liter: z.number().nullable(),
  deviation_pct: z.number().nullable(),
  z_score: z.number().nullable(),
  is_anomaly: z.boolean().nullable(),
});
export const anomalyDetectionResponseSchema = z.object({
  success: z.boolean(),
  data: anomalyDetectionDataSchema,
});
export type AnomalyDetectionData = z.infer<typeof anomalyDetectionDataSchema>;

/** GET /v1/fleet-units/:unitId/operator-score — operatorScorecard.ts */
export const operatorScorecardDataSchema = z.object({
  driver_id: z.number().nullable(),
  route_count: z.number().nullable(),
  fuel_efficiency_score: z.number().nullable(),
  incident_rate_score: z.number().nullable(),
  checkpoint_adherence_score: z.number().nullable(),
  composite_score: z.number().nullable(),
});
export const operatorScorecardResponseSchema = z.object({
  success: z.boolean(),
  data: operatorScorecardDataSchema,
});
export type OperatorScorecardData = z.infer<typeof operatorScorecardDataSchema>;

/** GET /v1/fleet-units/:unitId/co2 — co2.ts */
export const co2DataSchema = z.object({
  fuel_code: z.string().nullable(),
  co2_factor_kg_per_liter: z.number().nullable(),
  total_liters: z.number().nullable(),
  total_co2_kg: z.number().nullable(),
  period_from: z.string().nullable(),
  period_to: z.string().nullable(),
});
export const co2ResponseSchema = z.object({
  success: z.boolean(),
  data: co2DataSchema,
});
export type Co2Data = z.infer<typeof co2DataSchema>;

/**
 * GET/POST/PATCH /v1/fleet-units/:unitId/recalls — fleetRecalls.ts.
 * `status` reusa `RECALL_STATUS_ENUM` (apps/api/src/constants/recalls.ts);
 * duplicado aquí como literal porque ese archivo no es cross-boundary.
 */
export const recallStatusSchema = z.enum(['PENDING', 'COMPLETED', 'NOT_APPLICABLE']);
export type RecallStatus = z.infer<typeof recallStatusSchema>;

export const recallItemSchema = z.object({
  recall_id: z.number(),
  campaign_code: z.string(),
  description: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  published_date: z.string(),
  status: recallStatusSchema,
  resolved_at: z.string().nullable(),
  work_order_id: z.number().nullable(),
});
export type RecallItem = z.infer<typeof recallItemSchema>;

export const fleetRecallsResponseSchema = z.object({
  success: z.boolean(),
  count: z.number(),
  data: z.array(recallItemSchema),
});

/** POST/PATCH mutation replies — `{ success: true }`, sin `data`. */
export const recallActionResponseSchema = z.object({
  success: z.boolean(),
});

/** GET /v1/recalls/nhtsa, POST /v1/recalls/nhtsa/import — recallsNhtsa.ts */
export const nhtsaRecallSchema = z.object({
  campaignNumber: z.string(),
  subject: z.string(),
  summary: z.string(),
  remedy: z.string(),
  consequence: z.string(),
  component: z.string(),
  manufacturer: z.string(),
  nhtsaActionNumber: z.string(),
});
export type NhtsaRecall = z.infer<typeof nhtsaRecallSchema>;

export const nhtsaSearchResponseSchema = z.object({
  success: z.boolean(),
  count: z.number(),
  data: z.array(nhtsaRecallSchema),
});

export const nhtsaImportResponseSchema = z.object({
  success: z.boolean(),
  recall_id: z.number(),
  imported: z.boolean(),
});

/** GET /v1/catalogs/asset-types — catalogs.ts */
export const fieldVisibilitySchema = z.record(z.string(), z.boolean());
export type FieldVisibility = z.infer<typeof fieldVisibilitySchema>;

export const assetTypeEntrySchema = z.object({
  id: z.number(),
  code: z.string(),
  label: z.string(),
  icon_name: z.string(),
  fields: fieldVisibilitySchema,
});
export type AssetTypeEntry = z.infer<typeof assetTypeEntrySchema>;

export const assetTypesResponseSchema = z.object({
  success: z.boolean(),
  count: z.number(),
  data: z.array(assetTypeEntrySchema),
});
