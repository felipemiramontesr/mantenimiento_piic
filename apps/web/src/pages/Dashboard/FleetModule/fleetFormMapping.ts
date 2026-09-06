import { FleetUnit, CreateFleetUnit } from '../../../types/fleet';
import { toDateOnly } from '../../../utils/dateUtils';

const mapBaseIds = (unit: FleetUnit): Partial<CreateFleetUnit> => ({
  assetTypeId: unit.assetTypeId || 0,
  brandId: unit.brandId || 0,
  modelId: unit.modelId || 0,
  departmentId: unit.departmentId || undefined,
  operationalUseId: unit.operationalUseId || undefined,
  locationId: unit.locationId || undefined,
  engineTypeId: unit.engineTypeId || undefined,
  traccionId: unit.traccionId || 0,
  transmisionId: unit.transmisionId || 0,
  fuelTypeId: unit.fuelTypeId || 0,
  colorId: unit.colorId || undefined,
  maintenanceCenterId: unit.maintenanceCenterId || undefined,
});

const mapOperationalData = (unit: FleetUnit): Partial<CreateFleetUnit> => ({
  placas: unit.placas || undefined,
  numeroSerie: unit.numeroSerie || undefined,
  year: unit.year || 2024,
  tireSpec: unit.tireSpec || undefined,
  tireBrandId: unit.tireBrandId || undefined,
  terrainTypeId: unit.terrainTypeId || undefined,
  capacidadCarga: unit.capacidadCarga || undefined,
  fuelTankCapacity: unit.fuelTankCapacity || 0,
  odometer: unit.odometer || 0,
  protocolStartDate: toDateOnly(unit.protocolStartDate) || undefined,
  maintIntervalDays: unit.maintIntervalDays || 90,
  maintIntervalKm: unit.maintIntervalKm || 5000,
  lastServiceDate: toDateOnly(unit.lastServiceDate) || undefined,
  lastServiceReading: unit.lastServiceReading || 0,
  dailyUsageAvg: unit.dailyUsageAvg || undefined,
  initialFuelLevel: unit.initialFuelLevel ?? 100,
  lastFuelLevel: unit.lastFuelLevel ?? 100,
});

const mapLegalData = (unit: FleetUnit): Partial<CreateFleetUnit> => ({
  vencimientoVerificacion: toDateOnly(unit.vencimientoVerificacion) || undefined,
  circulationCardNumber: unit.circulationCardNumber || undefined,
  accountingAccount: unit.accountingAccount || undefined,
  legalComplianceDate: toDateOnly(unit.legalComplianceDate) || undefined,
  insuranceExpiryDate: toDateOnly(unit.insuranceExpiryDate) || undefined,
  insurancePolicyNumber: unit.insurancePolicyNumber || undefined,
  insuranceCompanyId: unit.insuranceCompanyId || undefined,
  insuranceCost: unit.insuranceCost || 0,
  lastEnvironmentalVerification: toDateOnly(unit.lastEnvironmentalVerification) || undefined,
  lastMechanicalVerification: toDateOnly(unit.lastMechanicalVerification) || undefined,
  environmentalHologram: unit.environmentalHologram || undefined,
  monthlyLeasePayment: unit.monthlyLeasePayment || 0,
  ownerId: unit.ownerId || undefined,
  complianceStatusId: unit.complianceStatusId || undefined,
});

/** FC 078 F2(b) — días hasta una fecha ISO; null si no hay fecha o es
 * inválida (misma semántica de umbral que daysColor en
 * MaintenanceForecastView). */
export const daysUntil = (iso: string | null): number | null => {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
};

export interface FleetCardAlert {
  tone: 'critical' | 'warning';
  label: string;
}

/** FC 078 F2(b) — alerta activa derivada de la verificación vehicular
 * vigente (vencida = critical, <=30 días = warning, resto = sin alerta). */
export const deriveFleetAlert = (unit: FleetUnit): FleetCardAlert | null => {
  const days = daysUntil(unit.vencimientoVerificacion);
  if (days === null) return null;
  if (days < 0) return { tone: 'critical', label: 'Verificación vencida' };
  if (days <= 30) return { tone: 'warning', label: `Verificación vence en ${days}d` };
  return null;
};

/** Combina los mapeos base/operacional/legal en el `CreateFleetUnit` que
 * consume `FleetRegistrationForm`. */
export const mapUnitToFormData = (unit: FleetUnit): CreateFleetUnit =>
  ({
    id: unit.id,
    images: unit.images || [],
    status: unit.status,
    description: unit.description || undefined,
    ...mapBaseIds(unit),
    ...mapOperationalData(unit),
    ...mapLegalData(unit),
  } as CreateFleetUnit);
