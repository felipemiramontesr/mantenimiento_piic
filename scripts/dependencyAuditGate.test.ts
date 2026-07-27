/**
 * FC 062 F2 — Tests del gate de auditoría de dependencias (Regla 19 · R-BDD-GHERKIN).
 * Scenario 2 del FC: dependencia critical/high en el árbol → el gate falla y bloquea.
 * T2 — AuditPass ≡ (critical = 0) ∧ (high = 0).
 */
import { describe, expect, it } from 'vitest';

import { ACCEPTED_EXCEPTIONS, countBySeverity, evaluateAuditPass } from './dependencyAuditGate';

describe('T2 — AuditPass (4 filas · dominio {⊤, ⊥})', () => {
  it('fila ⊤⊤: critical=0 ∧ high=0 → AuditPass ≡ ⊤', () => {
    expect(evaluateAuditPass({ critical: 0, high: 0 })).toBe(true);
  });

  it('fila ⊤⊥: critical=0 ∧ high>0 → AuditPass ≡ ⊥', () => {
    expect(evaluateAuditPass({ critical: 0, high: 2 })).toBe(false);
  });

  it('fila ⊥⊤: critical>0 ∧ high=0 → AuditPass ≡ ⊥', () => {
    expect(evaluateAuditPass({ critical: 1, high: 0 })).toBe(false);
  });

  it('fila ⊥⊥: critical>0 ∧ high>0 → AuditPass ≡ ⊥', () => {
    expect(evaluateAuditPass({ critical: 3, high: 1 })).toBe(false);
  });
});

describe('countBySeverity — parser del reporte `bun audit --json`', () => {
  it('Scenario 2 (happy path del gate): solo moderates → counts correctos y AuditPass ⊤', () => {
    // Forma real observada del reporte (2026-07-05): paquete → lista de advisories
    const report = {
      esbuild: [{ severity: 'moderate', title: 'dev server', url: 'https://x' }],
      micromatch: [{ severity: 'moderate', title: 'ReDoS', url: 'https://y' }],
      yaml: [{ severity: 'moderate', title: 'stack overflow', url: 'https://z' }],
    };
    const counts = countBySeverity(report);
    expect(counts).toMatchObject({ critical: 0, high: 0, moderate: 3, low: 0 });
    expect(evaluateAuditPass(counts)).toBe(true);
  });

  it('Scenario 2 (bloqueo): una advisory critical en el árbol → AuditPass ⊥', () => {
    const report = {
      'left-pad': [
        { severity: 'critical', title: 'RCE', url: 'https://x' },
        { severity: 'low', title: 'nit', url: 'https://y' },
      ],
    };
    const counts = countBySeverity(report);
    expect(counts.critical).toBe(1);
    expect(counts.low).toBe(1);
    expect(evaluateAuditPass(counts)).toBe(false);
  });

  it('reporte vacío (sin vulnerabilidades) → todo en 0 y AuditPass ⊤', () => {
    const counts = countBySeverity({});
    expect(counts).toMatchObject({ critical: 0, high: 0, moderate: 0, low: 0 });
    expect(evaluateAuditPass(counts)).toBe(true);
  });

  it('fail-closed: severidad no reconocida se cuenta como high → AuditPass ⊥', () => {
    const report = { mystery: [{ severity: 'catastrophic', title: '?', url: '' }] };
    const counts = countBySeverity(report);
    expect(counts.high).toBe(1);
    expect(evaluateAuditPass(counts)).toBe(false);
  });

  it('fail-closed: reporte malformado (no objeto / array / null) → lanza', () => {
    expect(() => countBySeverity(null)).toThrow();
    expect(() => countBySeverity([1, 2])).toThrow();
    expect(() => countBySeverity('nope')).toThrow();
    expect(() => countBySeverity({ pkg: 'not-an-array' })).toThrow();
  });
});

describe('FC083 H4 — ACCEPTED_EXCEPTIONS (excepción acotada, Cond.1-2 Bravo 2026-07-26)', () => {
  it('la excepción activa es exacta: solo brace-expansion + advisory 1124334', () => {
    expect(ACCEPTED_EXCEPTIONS).toHaveLength(1);
    expect(ACCEPTED_EXCEPTIONS[0]).toMatchObject({
      packageName: 'brace-expansion',
      advisoryId: 1124334,
    });
  });

  it('high de brace-expansion CON el advisory exacto → se exceptúa, AuditPass ⊤', () => {
    const report = {
      'brace-expansion': [
        {
          id: 1124334,
          severity: 'high',
          title: 'brace-expansion: DoS via unbounded expansion length',
          url: 'https://github.com/advisories/GHSA-mh99-v99m-4gvg',
        },
      ],
    };
    const counts = countBySeverity(report);
    expect(counts.high).toBe(0);
    expect(evaluateAuditPass(counts)).toBe(true);
  });

  it('Cond.2 Bravo: high de brace-expansion con OTRO advisory ID → NO se exceptúa, AuditPass ⊥', () => {
    const report = {
      'brace-expansion': [
        {
          id: 9999999, // CVE futuro distinto, no cubierto por la allowlist
          severity: 'high',
          title: 'brace-expansion: otra vulnerabilidad hipotética',
          url: 'https://example.invalid',
        },
      ],
    };
    const counts = countBySeverity(report);
    expect(counts.high).toBe(1);
    expect(evaluateAuditPass(counts)).toBe(false);
  });

  it('Cond.1 Bravo: high de OTRO paquete distinto → NO se exceptúa, AuditPass ⊥', () => {
    const report = {
      'left-pad': [{ id: 1124334, severity: 'high', title: 'RCE', url: 'https://x' }],
    };
    const counts = countBySeverity(report);
    expect(counts.high).toBe(1);
    expect(evaluateAuditPass(counts)).toBe(false);
  });

  it('excepción convive con un high real no relacionado: solo se descuenta el exceptuado', () => {
    const report = {
      'brace-expansion': [{ id: 1124334, severity: 'high', title: 'x', url: 'https://x' }],
      'left-pad': [{ id: 42, severity: 'high', title: 'RCE', url: 'https://y' }],
    };
    const counts = countBySeverity(report);
    expect(counts.high).toBe(1);
    expect(evaluateAuditPass(counts)).toBe(false);
  });
});
