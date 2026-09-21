import withCapability from '../plugins/capabilityGate';
import fleetPlugin from './fleet';
import journeyPlugin from './fleetRoutes';
import realtimeTelemetryPlugin from './realtimeTelemetry';
import fleetIntelligencePlugin from './fleetIntelligence';
import anomalyDetectionPlugin from './anomalyDetection';
import operatorScorecardPlugin from './operatorScorecard';
import co2Plugin from './co2';
import fleetMaintenancePlugin from './fleetMaintenance';
import workOrderPlugin from './workOrders';
import reportsPlugin from './reports';
import fleetRecallsPlugin from './fleetRecalls';
import recallsNhtsaPlugin from './recallsNhtsa';
import recallsInternalPlugin from './recallsInternal';
import financePlugin from './finance';
import fleetTcoPlugin from './fleetTco';
import economicLifePlugin from './economicLife';

/**
 * FC193 F2 — TABLA ÚNICA plugin de rutas → Supercúmulo (D2/D7 de 373_AN). `index.ts` registra estas
 * versiones envueltas (`withCapability`) bajo `/v1` y `/v1/mantenimiento`, así que ambos prefijos heredan
 * el gate. Un plugin de negocio nuevo se añade AQUÍ; `capabilityRoutes.test.ts` falla si una ruta queda
 * sin clasificar.
 *
 * NO están aquí, a propósito (clase BUILTIN / Ω / pública — nunca se apagan por mutabilidad de SC,
 * §24.3 y §24.10.3): auth, sesión y MFA, `security` (incluye el SOS — A1-H/P, exención permanente D4),
 * `users`, `cosmonauts`, `onboarding`, `alerts`, `notifications`, `areas`, `ownerProfile`, `catalogs`,
 * `geolocation` (catálogos de dirección), `social`, `publicSignup`, `cosmology` y `telemetry`
 * (`/v1/archon/telemetry` es solo-Ω).
 */

// RASTREO (perm_prefix `fleet`; absorbe `route`, L §24.3)
export const fleetRoutes = withCapability({ supercluster: 'RASTREO' }, fleetPlugin);
export const journeyRoutes = withCapability({ supercluster: 'RASTREO' }, journeyPlugin);
export const realtimeTelemetryRoutes = withCapability(
  { supercluster: 'RASTREO' },
  realtimeTelemetryPlugin
);
export const fleetIntelligenceRoutes = withCapability(
  { supercluster: 'RASTREO' },
  fleetIntelligencePlugin
);
export const anomalyDetectionRoutes = withCapability(
  { supercluster: 'RASTREO' },
  anomalyDetectionPlugin
);
export const operatorScorecardRoutes = withCapability(
  { supercluster: 'RASTREO' },
  operatorScorecardPlugin
);
export const co2Routes = withCapability({ supercluster: 'RASTREO' }, co2Plugin);

// MANTENIMIENTO (dependencia declarada → RASTREO, D9)
export const fleetMaintenanceRoutes = withCapability(
  { supercluster: 'MANTENIMIENTO' },
  fleetMaintenancePlugin
);
export const workOrderRoutes = withCapability({ supercluster: 'MANTENIMIENTO' }, workOrderPlugin);
export const reportsRoutes = withCapability({ supercluster: 'MANTENIMIENTO' }, reportsPlugin);
export const fleetRecallsRoutes = withCapability(
  { supercluster: 'MANTENIMIENTO' },
  fleetRecallsPlugin
);
export const recallsNhtsaRoutes = withCapability(
  { supercluster: 'MANTENIMIENTO' },
  recallsNhtsaPlugin
);
export const recallsInternalRoutes = withCapability(
  { supercluster: 'MANTENIMIENTO' },
  recallsInternalPlugin
);

// FINANZAS (D5: el gate de SC convive con `resolveFinanceClusterScope`, defensa en profundidad)
export const financeRoutes = withCapability({ supercluster: 'FINANZAS' }, financePlugin);
export const fleetTcoRoutes = withCapability({ supercluster: 'FINANZAS' }, fleetTcoPlugin);
export const economicLifeRoutes = withCapability({ supercluster: 'FINANZAS' }, economicLifePlugin);
