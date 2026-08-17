import { describe, it, expect } from 'vitest';
import {
  userUpdateSchema,
  routeUpdateSchema,
  alertTypeSchema,
  alertSeveritySchema,
  alertSchema,
  alertsArraySchema,
  alertsCountResponseSchema,
  fleetIntelligenceResponseSchema,
  economicLifeResponseSchema,
  anomalyDetectionResponseSchema,
  operatorScorecardResponseSchema,
  co2ResponseSchema,
  recallStatusSchema,
  recallItemSchema,
  fleetRecallsResponseSchema,
  recallActionResponseSchema,
  nhtsaRecallSchema,
  nhtsaSearchResponseSchema,
  nhtsaImportResponseSchema,
  fieldVisibilitySchema,
  assetTypeEntrySchema,
  assetTypesResponseSchema,
} from './index';

/**
 * FC162 F1-T3 — packages/contracts had zero test coverage (no vitest config
 * of its own, and neither apps/api's nor apps/web's lcov attributed lines
 * back to this package's aliased source). Beyond closing the Sonar gap, this
 * is a real regression guard for the SSOT contract-drift protection this
 * package exists for (FC076 F4 / FC142 F1) — each schema is exercised with
 * both an accepting and a rejecting payload, not just imported.
 */

const ALERT = {
  id: 'a1',
  type: 'MAINTENANCE_OVERDUE',
  severity: 'HIGH',
  title: 'Overdue',
  description: 'Unit overdue for service',
  unitId: 'ASM-001',
  createdAt: '2026-08-17T00:00:00.000Z',
};

describe('auth/route mutation schemas', () => {
  it('userUpdateSchema accepts a minimal valid payload', () => {
    expect(userUpdateSchema.safeParse({ data: {}, reason: 'valid reason' }).success).toBe(true);
  });

  it('userUpdateSchema accepts a full valid payload', () => {
    expect(
      userUpdateSchema.safeParse({
        data: {
          fullName: 'GrayMan',
          department: 'IT',
          email: 'admin@piic.com',
          password: 'longenough',
          roleId: 0,
          profilePictureUrl: '/uploads/a.jpg',
          employeeNumber: 'EMP-001',
          departmentId: 1,
          is_active: true,
        },
        reason: 'valid reason',
      }).success
    ).toBe(true);
  });

  it('userUpdateSchema rejects a reason shorter than 5 chars', () => {
    expect(userUpdateSchema.safeParse({ data: {}, reason: 'no' }).success).toBe(false);
  });

  it('userUpdateSchema rejects an invalid email', () => {
    expect(
      userUpdateSchema.safeParse({ data: { email: 'not-an-email' }, reason: 'valid reason' })
        .success
    ).toBe(false);
  });

  it('routeUpdateSchema accepts an arbitrary data record with a valid reason', () => {
    expect(
      routeUpdateSchema.safeParse({ data: { end_reading: 1000 }, reason: 'valid reason' }).success
    ).toBe(true);
  });

  it('routeUpdateSchema rejects a missing reason', () => {
    expect(routeUpdateSchema.safeParse({ data: {} }).success).toBe(false);
  });
});

describe('alert schemas', () => {
  it('alertTypeSchema accepts every declared literal', () => {
    const values = [
      'MAINTENANCE_OVERDUE',
      'INCIDENT_OPEN',
      'UNIT_CRITICAL',
      'COMPLIANCE_EXPIRY',
      'LEASE_PAYMENT_MISSING',
      'FINE_REGISTERED',
      'EXPENSE_ANOMALY',
    ];
    values.forEach((v) => expect(alertTypeSchema.safeParse(v).success).toBe(true));
  });

  it('alertTypeSchema rejects an unknown literal', () => {
    expect(alertTypeSchema.safeParse('NOT_A_TYPE').success).toBe(false);
  });

  it('alertSeveritySchema accepts every declared literal and rejects unknown ones', () => {
    ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].forEach((v) =>
      expect(alertSeveritySchema.safeParse(v).success).toBe(true)
    );
    expect(alertSeveritySchema.safeParse('URGENT').success).toBe(false);
  });

  it('alertSchema accepts a well-formed alert', () => {
    expect(alertSchema.safeParse(ALERT).success).toBe(true);
  });

  it('alertSchema rejects an alert with an invalid type', () => {
    expect(alertSchema.safeParse({ ...ALERT, type: 'NOT_A_TYPE' }).success).toBe(false);
  });

  it('alertsArraySchema accepts an array of valid alerts and rejects one bad item', () => {
    expect(alertsArraySchema.safeParse([ALERT, ALERT]).success).toBe(true);
    expect(alertsArraySchema.safeParse([ALERT, { ...ALERT, severity: 'URGENT' }]).success).toBe(
      false
    );
  });

  it('alertsCountResponseSchema accepts a valid envelope and rejects a wrong-typed count', () => {
    expect(alertsCountResponseSchema.safeParse({ success: true, count: 3 }).success).toBe(true);
    expect(alertsCountResponseSchema.safeParse({ success: true, count: '3' }).success).toBe(false);
  });
});

describe('FleetUnitNode data-fetching response schemas (FC142 F1)', () => {
  it('fleetIntelligenceResponseSchema accepts nulls and numbers, rejects a missing field', () => {
    expect(
      fleetIntelligenceResponseSchema.safeParse({
        success: true,
        data: {
          oee: null,
          tco_per_km: 1.2,
          km_per_liter: 8.5,
          pm_compliance: 0.9,
          backlog_aging_days: 2,
        },
      }).success
    ).toBe(true);
    expect(
      fleetIntelligenceResponseSchema.safeParse({
        success: true,
        data: { oee: null, tco_per_km: null, km_per_liter: null, pm_compliance: null },
      }).success
    ).toBe(false);
  });

  it('economicLifeResponseSchema accepts a valid recommendation and rejects an invalid one', () => {
    expect(
      economicLifeResponseSchema.safeParse({
        success: true,
        data: {
          residual_value_mxn: 1000,
          accumulated_tco: 500,
          replacement_score: 0.5,
          recommendation: 'KEEP',
        },
      }).success
    ).toBe(true);
    expect(
      economicLifeResponseSchema.safeParse({
        success: true,
        data: {
          residual_value_mxn: null,
          accumulated_tco: null,
          replacement_score: null,
          recommendation: 'MAYBE',
        },
      }).success
    ).toBe(false);
  });

  it('anomalyDetectionResponseSchema accepts a fully-null payload and rejects a wrong-typed one', () => {
    expect(
      anomalyDetectionResponseSchema.safeParse({
        success: true,
        data: {
          fleet_size: null,
          algorithm: null,
          unit_km_per_liter: null,
          baseline_km_per_liter: null,
          deviation_pct: null,
          z_score: null,
          is_anomaly: null,
        },
      }).success
    ).toBe(true);
    expect(
      anomalyDetectionResponseSchema.safeParse({
        success: true,
        data: { fleet_size: 'ten' },
      }).success
    ).toBe(false);
  });

  it('operatorScorecardResponseSchema accepts nulls and rejects a missing data key', () => {
    expect(
      operatorScorecardResponseSchema.safeParse({
        success: true,
        data: {
          driver_id: null,
          route_count: null,
          fuel_efficiency_score: null,
          incident_rate_score: null,
          checkpoint_adherence_score: null,
          composite_score: null,
        },
      }).success
    ).toBe(true);
    expect(operatorScorecardResponseSchema.safeParse({ success: true }).success).toBe(false);
  });

  it('co2ResponseSchema accepts nulls and rejects a wrong-typed number field', () => {
    expect(
      co2ResponseSchema.safeParse({
        success: true,
        data: {
          fuel_code: null,
          co2_factor_kg_per_liter: null,
          total_liters: null,
          total_co2_kg: null,
          period_from: null,
          period_to: null,
        },
      }).success
    ).toBe(true);
    expect(
      co2ResponseSchema.safeParse({ success: true, data: { total_co2_kg: '100' } }).success
    ).toBe(false);
  });
});

describe('recall schemas', () => {
  it('recallStatusSchema accepts every declared literal and rejects unknown ones', () => {
    ['PENDING', 'COMPLETED', 'NOT_APPLICABLE'].forEach((v) =>
      expect(recallStatusSchema.safeParse(v).success).toBe(true)
    );
    expect(recallStatusSchema.safeParse('IN_PROGRESS').success).toBe(false);
  });

  const RECALL_ITEM = {
    recall_id: 1,
    campaign_code: 'C-1',
    description: 'desc',
    make: 'Toyota',
    model: 'Hilux',
    year: 2023,
    published_date: '2026-01-01',
    status: 'PENDING',
    resolved_at: null,
    work_order_id: null,
  };

  it('recallItemSchema accepts a valid item and rejects an invalid status', () => {
    expect(recallItemSchema.safeParse(RECALL_ITEM).success).toBe(true);
    expect(recallItemSchema.safeParse({ ...RECALL_ITEM, status: 'DONE' }).success).toBe(false);
  });

  it('fleetRecallsResponseSchema accepts a valid list envelope and rejects a bad item inside it', () => {
    expect(
      fleetRecallsResponseSchema.safeParse({ success: true, count: 1, data: [RECALL_ITEM] }).success
    ).toBe(true);
    expect(
      fleetRecallsResponseSchema.safeParse({
        success: true,
        count: 1,
        data: [{ ...RECALL_ITEM, status: 'DONE' }],
      }).success
    ).toBe(false);
  });

  it('recallActionResponseSchema accepts a bare success envelope', () => {
    expect(recallActionResponseSchema.safeParse({ success: true }).success).toBe(true);
    expect(recallActionResponseSchema.safeParse({}).success).toBe(false);
  });

  const NHTSA_RECALL = {
    campaignNumber: 'C1',
    subject: 'Brakes',
    summary: 'summary',
    remedy: 'remedy',
    consequence: 'consequence',
    component: 'BRAKES',
    manufacturer: 'Toyota',
    nhtsaActionNumber: 'A1',
  };

  it('nhtsaRecallSchema accepts a fully-populated item and rejects a missing field', () => {
    expect(nhtsaRecallSchema.safeParse(NHTSA_RECALL).success).toBe(true);
    const { campaignNumber: _drop, ...missingField } = NHTSA_RECALL;
    expect(nhtsaRecallSchema.safeParse(missingField).success).toBe(false);
  });

  it('nhtsaSearchResponseSchema accepts a valid list envelope', () => {
    expect(
      nhtsaSearchResponseSchema.safeParse({ success: true, count: 1, data: [NHTSA_RECALL] }).success
    ).toBe(true);
  });

  it('nhtsaImportResponseSchema accepts a valid import result and rejects a wrong-typed flag', () => {
    expect(
      nhtsaImportResponseSchema.safeParse({ success: true, recall_id: 1, imported: true }).success
    ).toBe(true);
    expect(
      nhtsaImportResponseSchema.safeParse({ success: true, recall_id: 1, imported: 'yes' }).success
    ).toBe(false);
  });
});

describe('catalog schemas', () => {
  it('fieldVisibilitySchema accepts a string-to-boolean record and rejects a non-boolean value', () => {
    expect(fieldVisibilitySchema.safeParse({ placas: true, numeroSerie: false }).success).toBe(
      true
    );
    expect(fieldVisibilitySchema.safeParse({ placas: 'yes' }).success).toBe(false);
  });

  const ASSET_TYPE = {
    id: 1,
    code: 'VEHICULO',
    label: 'Vehículo',
    icon_name: 'truck',
    fields: { placas: true },
  };

  it('assetTypeEntrySchema accepts a valid entry and rejects a non-record fields value', () => {
    expect(assetTypeEntrySchema.safeParse(ASSET_TYPE).success).toBe(true);
    expect(assetTypeEntrySchema.safeParse({ ...ASSET_TYPE, fields: 'nope' }).success).toBe(false);
  });

  it('assetTypesResponseSchema accepts a valid list envelope', () => {
    expect(
      assetTypesResponseSchema.safeParse({ success: true, count: 1, data: [ASSET_TYPE] }).success
    ).toBe(true);
  });
});
