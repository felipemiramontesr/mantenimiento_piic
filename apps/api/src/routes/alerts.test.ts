import { describe, it, expect } from 'vitest';
import {
  buildOverdueDescription,
  computeOverdueSeverity,
  resolveAlertScope,
  computeComplianceSeverity,
  buildComplianceDescription,
  computeLeaseMissingSeverity,
  computeAnomalySeverity,
  buildLeaseMissingDescription,
  buildFineDescription,
  buildAnomalyDescription,
} from './alerts';

// ─── computeOverdueSeverity ───────────────────────────────────────────────────

describe('computeOverdueSeverity — km-based', () => {
  it('CRITICAL when odometer >= 150% of forecast', () => {
    expect(computeOverdueSeverity(15000, 10000, null, null)).toBe('CRITICAL');
  });

  it('HIGH when odometer is 110–149% of forecast', () => {
    expect(computeOverdueSeverity(12000, 10000, null, null)).toBe('HIGH');
  });

  it('MEDIUM when odometer is 100–109% of forecast', () => {
    expect(computeOverdueSeverity(10500, 10000, null, null)).toBe('MEDIUM');
  });

  it('LOW when odometer is 90–99% of forecast (approaching)', () => {
    expect(computeOverdueSeverity(9500, 10000, null, null)).toBe('LOW');
  });

  it('LOW when forecast is null (no km criterion)', () => {
    expect(computeOverdueSeverity(50000, null, null, null)).toBe('LOW');
  });
});

describe('computeOverdueSeverity — days-based', () => {
  it('CRITICAL when > 60 days overdue', () => {
    const date = new Date();
    date.setDate(date.getDate() - 240);
    expect(computeOverdueSeverity(0, null, date, 90)).toBe('CRITICAL');
  });

  it('HIGH when 30–60 days overdue', () => {
    const date = new Date();
    date.setDate(date.getDate() - 130);
    expect(computeOverdueSeverity(0, null, date, 90)).toBe('HIGH');
  });

  it('MEDIUM when 14–30 days overdue', () => {
    const date = new Date();
    date.setDate(date.getDate() - 110);
    expect(computeOverdueSeverity(0, null, date, 90)).toBe('MEDIUM');
  });

  it('LOW when <= 14 days overdue', () => {
    const date = new Date();
    date.setDate(date.getDate() - 97);
    expect(computeOverdueSeverity(0, null, date, 90)).toBe('LOW');
  });

  it('LOW when upcoming (within 14 days before due)', () => {
    const date = new Date();
    date.setDate(date.getDate() - 83);
    expect(computeOverdueSeverity(0, null, date, 90)).toBe('LOW');
  });
});

describe('computeOverdueSeverity — max of both criteria', () => {
  it('returns max severity when km=MEDIUM and days=HIGH', () => {
    const date = new Date();
    date.setDate(date.getDate() - 130);
    expect(computeOverdueSeverity(10500, 10000, date, 90)).toBe('HIGH');
  });

  it('returns max severity when km=HIGH and days=MEDIUM', () => {
    const date = new Date();
    date.setDate(date.getDate() - 110);
    expect(computeOverdueSeverity(12000, 10000, date, 90)).toBe('HIGH');
  });
});

// ─── buildOverdueDescription ─────────────────────────────────────────────────

describe('buildOverdueDescription', () => {
  it('returns forecast overdue message when odometer exceeds forecast', () => {
    expect(buildOverdueDescription(50000, 45000, '2025-01-01', 180)).toBe(
      'Odómetro 50000 km supera el pronóstico de 45000 km'
    );
  });

  it('returns km approaching message when odometer is below forecast', () => {
    const result = buildOverdueDescription(9500, 10000, '2025-01-01', 180);
    expect(result).toContain('Pronóstico: 10000 km');
    expect(result).toContain('faltan 500 km');
    expect(result).not.toContain('supera');
  });

  it('does not produce "null" in output when nextServiceForecast is null', () => {
    const result = buildOverdueDescription(50000, null, '2025-01-01', 180);
    expect(result).not.toContain('null');
    expect(result).toContain('Último Mantenimiento');
  });

  it('returns days overdue message when date-based and overdue', () => {
    const result = buildOverdueDescription(0, null, '2020-01-01', 30);
    expect(result).toContain('días vencido');
    expect(result).not.toContain('null');
  });

  it('returns upcoming message when date-based and not yet due', () => {
    const date = new Date();
    date.setDate(date.getDate() - 10);
    const result = buildOverdueDescription(0, null, date, 90);
    expect(result).toContain('Próximo Mantenimiento');
    expect(result).toContain('en');
    expect(result).not.toContain('null');
  });

  it('shows N/D for null lastServiceDate', () => {
    const result = buildOverdueDescription(50000, null, null, 180);
    expect(result).toContain('N/D');
    expect(result).not.toContain('null');
  });

  it('shows N/D for null maintIntervalDays', () => {
    const result = buildOverdueDescription(50000, null, '2025-01-01', null);
    expect(result).toContain('N/D');
    expect(result).not.toContain('null');
  });

  it('formats Date object without English weekday/timezone strings', () => {
    const date = new Date('2025-12-01T06:00:00.000Z');
    const result = buildOverdueDescription(50000, null, date, 180);
    expect(result).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
    expect(result).not.toContain('GMT');
    expect(result).not.toContain('hora estándar');
  });

  it('formats ISO string date in Spanish locale', () => {
    const result = buildOverdueDescription(50000, null, '2025-12-01', 180);
    expect(result).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
  });

  it('line 27: invalid date string returns raw value via formatDateEsMx NaN path', () => {
    const result = buildOverdueDescription(50000, null, 'not-a-date', null);
    expect(result).toContain('not-a-date');
  });

  it('line 87: string lastServiceDate in not-yet-due path hits instanceof false branch', () => {
    const dateStr = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    const result = buildOverdueDescription(0, null, dateStr, 90);
    expect(result).toContain('Próximo Mantenimiento');
  });
});

// ─── resolveAlertScope (Feature Contract: Alerts_Role_Scoped_Panel) ──────────

describe('resolveAlertScope — mapeo alerta→permiso', () => {
  it('maint:view grants only MAINTENANCE_OVERDUE', () => {
    expect(resolveAlertScope(['maint:view'])).toEqual(new Set(['MAINTENANCE_OVERDUE']));
  });

  it('route:view grants only INCIDENT_OPEN', () => {
    expect(resolveAlertScope(['route:view'])).toEqual(new Set(['INCIDENT_OPEN']));
  });

  it('fleet:view grants UNIT_CRITICAL and COMPLIANCE_EXPIRY (Fase 4)', () => {
    expect(resolveAlertScope(['fleet:view'])).toEqual(
      new Set(['UNIT_CRITICAL', 'COMPLIANCE_EXPIRY'])
    );
  });

  it('omnipotent * grants every registered type', () => {
    expect(resolveAlertScope(['*'])).toEqual(
      new Set([
        'MAINTENANCE_OVERDUE',
        'INCIDENT_OPEN',
        'UNIT_CRITICAL',
        'COMPLIANCE_EXPIRY',
        'LEASE_PAYMENT_MISSING',
        'FINE_REGISTERED',
        'EXPENSE_ANOMALY',
      ])
    );
  });

  it('empty permissions resolve to empty scope (deny-by-default)', () => {
    expect(resolveAlertScope([]).size).toBe(0);
  });

  it('irrelevant slugs resolve to empty scope', () => {
    expect(resolveAlertScope(['report:export', 'user:admin', 'financial:write']).size).toBe(0);
  });

  it('multi-domain permissions accumulate their types', () => {
    expect(resolveAlertScope(['maint:view', 'fleet:view'])).toEqual(
      new Set(['MAINTENANCE_OVERDUE', 'UNIT_CRITICAL', 'COMPLIANCE_EXPIRY'])
    );
  });

  it('* mixed with specific slugs still grants every type (early return)', () => {
    expect(resolveAlertScope(['maint:view', '*']).size).toBe(7);
  });

  it('write slugs do NOT grant view scope (least privilege)', () => {
    expect(resolveAlertScope(['maint:write', 'route:write', 'fleet:write']).size).toBe(0);
  });

  it('financial:view grants the three finance types (Contrato Finanzas)', () => {
    expect(resolveAlertScope(['financial:view'])).toEqual(
      new Set(['LEASE_PAYMENT_MISSING', 'FINE_REGISTERED', 'EXPENSE_ANOMALY'])
    );
  });

  it('omnipotent * grants all seven types', () => {
    expect(resolveAlertScope(['*']).size).toBe(7);
  });
});

// ─── Contrato Alerts_Finance_Domain — severidades y descripciones ────────────

describe('computeLeaseMissingSeverity — escalado por día del mes (10/20, ajustable por PO)', () => {
  it('LOW durante los primeros 10 días', () => {
    expect(computeLeaseMissingSeverity(1)).toBe('LOW');
    expect(computeLeaseMissingSeverity(10)).toBe('LOW');
  });

  it('MEDIUM del día 11 al 20', () => {
    expect(computeLeaseMissingSeverity(11)).toBe('MEDIUM');
    expect(computeLeaseMissingSeverity(20)).toBe('MEDIUM');
  });

  it('HIGH después del día 20', () => {
    expect(computeLeaseMissingSeverity(21)).toBe('HIGH');
    expect(computeLeaseMissingSeverity(31)).toBe('HIGH');
  });
});

describe('computeAnomalySeverity — escalado por ratio', () => {
  it('MEDIUM desde 1.5×', () => {
    expect(computeAnomalySeverity(1.5)).toBe('MEDIUM');
    expect(computeAnomalySeverity(1.99)).toBe('MEDIUM');
  });

  it('HIGH desde 2×', () => {
    expect(computeAnomalySeverity(2)).toBe('HIGH');
    expect(computeAnomalySeverity(2.9)).toBe('HIGH');
  });

  it('CRITICAL desde 3×', () => {
    expect(computeAnomalySeverity(3)).toBe('CRITICAL');
    expect(computeAnomalySeverity(5.2)).toBe('CRITICAL');
  });
});

describe('descripciones financieras — es-MX con moneda formateada', () => {
  it('renta sin registrar incluye monto y días transcurridos', () => {
    expect(buildLeaseMissingDescription(11535, 11)).toBe(
      'Renta de $11,535.00 sin registrar este mes (van 11 días)'
    );
  });

  it('multa con proveedor', () => {
    expect(buildFineDescription(2500, 'Tránsito ZAC')).toBe(
      'Multa registrada: $2,500.00 — Tránsito ZAC'
    );
  });

  it('multa sin proveedor usa fallback es-MX', () => {
    expect(buildFineDescription(1800, null)).toBe('Multa registrada: $1,800.00 — sin proveedor');
  });

  it('gasto anómalo incluye monto, ratio y promedio', () => {
    expect(buildAnomalyDescription(20000, 8000, 2.5)).toBe(
      'Gasto del mes $20,000.00 — 2.5× su promedio semestral ($8,000.00)'
    );
  });
});

// ─── Fase 4 — COMPLIANCE_EXPIRY (vencimientos legales) ───────────────────────

describe('computeComplianceSeverity — escalado por días restantes', () => {
  it('CRITICAL when document is already expired (negative days)', () => {
    expect(computeComplianceSeverity(-1)).toBe('CRITICAL');
    expect(computeComplianceSeverity(-30)).toBe('CRITICAL');
  });

  it('HIGH when expiring within 3 days (including today)', () => {
    expect(computeComplianceSeverity(0)).toBe('HIGH');
    expect(computeComplianceSeverity(3)).toBe('HIGH');
  });

  it('MEDIUM when expiring within 15 days', () => {
    expect(computeComplianceSeverity(4)).toBe('MEDIUM');
    expect(computeComplianceSeverity(15)).toBe('MEDIUM');
  });

  it('LOW when expiring within 30 days', () => {
    expect(computeComplianceSeverity(16)).toBe('LOW');
    expect(computeComplianceSeverity(30)).toBe('LOW');
  });
});

describe('buildComplianceDescription — es-MX', () => {
  it('describes expired document with elapsed days', () => {
    expect(buildComplianceDescription('Seguro', -5)).toBe('Seguro vencido hace 5 días');
  });

  it('describes document expiring today', () => {
    expect(buildComplianceDescription('Verificación', 0)).toBe('Verificación vence hoy');
  });

  it('describes upcoming expiry with remaining days', () => {
    expect(buildComplianceDescription('Cumplimiento legal', 12)).toBe(
      'Cumplimiento legal vence en 12 días'
    );
  });

  it('concuerda género femenino: Verificación vencida (no "vencido")', () => {
    expect(buildComplianceDescription('Verificación', -25, 'vencida')).toBe(
      'Verificación vencida hace 25 días'
    );
  });

  it('participio por defecto es masculino', () => {
    expect(buildComplianceDescription('Cumplimiento legal', -3)).toBe(
      'Cumplimiento legal vencido hace 3 días'
    );
  });
});
