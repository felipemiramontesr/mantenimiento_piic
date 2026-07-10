/**
 * FC 069 F1+F4 — Tests del generador puro del dashboard (Regla 19 · R-BDD-GHERKIN).
 * T1 (4 filas), T2 (cero tolerancia — enmienda v1.1) y Scenarios 1,2,5,7 del FC.
 */
import { describe, expect, it } from 'vitest';

import {
  computeCategoryStatus,
  computeGlobalCertificationPass,
  computeOwaspResults,
  generateCertificationDashboard,
  mergeJunitSuiteMaps,
  parseJUnitTestsuites,
  type DashboardInput,
  type OwaspCoverageMap,
} from './generateCertificationDashboard';

describe('T1 — CategoryStatus (4 filas · dominio {⊤, ⊥})', () => {
  const junitSuites = {
    api: { 'src/services/encryption.test.ts': { tests: 5, failures: 0 } },
    web: {},
  };

  it('fila ⊤⊤: test mapeado existe y pasa → PASSED', () => {
    const status = computeCategoryStatus(
      { label: 'x', method: 'junit', app: 'api', files: ['src/services/encryption.test.ts'] },
      junitSuites,
      {}
    );
    expect(status).toBe('PASSED');
  });

  it('fila ⊤⊥: test mapeado existe pero falla → FAILED', () => {
    const status = computeCategoryStatus(
      { label: 'x', method: 'junit', app: 'api', files: ['src/services/encryption.test.ts'] },
      { api: { 'src/services/encryption.test.ts': { tests: 5, failures: 2 } }, web: {} },
      {}
    );
    expect(status).toBe('FAILED');
  });

  it('fila ⊥ (sin mapeo): archivo no existe en el JUnit → NO VERIFICADO', () => {
    const status = computeCategoryStatus(
      { label: 'x', method: 'junit', app: 'api', files: ['src/nope.test.ts'] },
      junitSuites,
      {}
    );
    expect(status).toBe('NO VERIFICADO');
  });

  it('fila ⊥ (sin archivos declarados): NO VERIFICADO', () => {
    const status = computeCategoryStatus(
      { label: 'x', method: 'junit', app: 'api' },
      junitSuites,
      {}
    );
    expect(status).toBe('NO VERIFICADO');
  });

  it('método script sin resultado registrado → NO VERIFICADO', () => {
    const status = computeCategoryStatus(
      { label: 'x', method: 'script', script: 'scripts/checkNoRawSql.ts' },
      junitSuites,
      {}
    );
    expect(status).toBe('NO VERIFICADO');
  });

  it('método script con resultado true → PASSED; false → FAILED', () => {
    const entry = { label: 'x', method: 'script' as const, script: 'scripts/checkNoRawSql.ts' };
    expect(computeCategoryStatus(entry, junitSuites, { 'scripts/checkNoRawSql.ts': true })).toBe(
      'PASSED'
    );
    expect(computeCategoryStatus(entry, junitSuites, { 'scripts/checkNoRawSql.ts': false })).toBe(
      'FAILED'
    );
  });
});

describe('Scenario 1/2 — dominio finito OWASP (computeOwaspResults)', () => {
  const coverageMap: OwaspCoverageMap = {
    A02: { label: 'Cryptographic Failures', method: 'junit', app: 'api', files: ['enc.test.ts'] },
    A03: { label: 'Injection', method: 'script', script: 'scripts/checkNoRawSql.ts' },
  };

  it('Scenario 1 — categoría sin archivo mapeado presente en JUnit nunca es PASSED', () => {
    const results = computeOwaspResults(coverageMap, { api: {}, web: {} }, {});
    expect(results.A02).toBe('NO VERIFICADO');
    expect(results.A02).not.toBe('PASSED');
  });

  it('Scenario 2 — categoría con test real y 0 failures → PASSED derivado de JUnit', () => {
    const results = computeOwaspResults(
      coverageMap,
      { api: { 'enc.test.ts': { tests: 3, failures: 0 } }, web: {} },
      { 'scripts/checkNoRawSql.ts': true }
    );
    expect(results.A02).toBe('PASSED');
    expect(results.A03).toBe('PASSED');
  });
});

describe('T2 — GlobalCertificationPass (enmienda v1.1: cero tolerancia a NO VERIFICADO)', () => {
  const fullPassOwasp = { A01: 'PASSED', A02: 'PASSED' } as const;

  it('todas las señales PASSED → GlobalCertificationPass ⊤', () => {
    const result = computeGlobalCertificationPass(
      { passed: 10, total: 10 },
      { passed: 20, total: 20 },
      'PASSED',
      'PASSED',
      'PASSED',
      { ...fullPassOwasp }
    );
    expect(result).toBe(true);
  });

  it('Scenario 7 — una sola categoría OWASP en NO VERIFICADO fuerza GlobalCertificationPass ⊥', () => {
    const result = computeGlobalCertificationPass(
      { passed: 10, total: 10 },
      { passed: 20, total: 20 },
      'PASSED',
      'PASSED',
      'PASSED',
      { A01: 'PASSED', A02: 'NO VERIFICADO' }
    );
    expect(result).toBe(false);
  });

  it('backend con failures → GlobalCertificationPass ⊥ aunque OWASP esté completo', () => {
    const result = computeGlobalCertificationPass(
      { passed: 8, total: 10 },
      { passed: 20, total: 20 },
      'PASSED',
      'PASSED',
      'PASSED',
      { ...fullPassOwasp }
    );
    expect(result).toBe(false);
  });

  it('E2E o Sonar en FAILED fuerza GlobalCertificationPass ⊥', () => {
    expect(
      computeGlobalCertificationPass(
        { passed: 10, total: 10 },
        { passed: 20, total: 20 },
        'PASSED',
        'FAILED',
        'PASSED',
        { ...fullPassOwasp }
      )
    ).toBe(false);
    expect(
      computeGlobalCertificationPass(
        { passed: 10, total: 10 },
        { passed: 20, total: 20 },
        'PASSED',
        'PASSED',
        'FAILED',
        { ...fullPassOwasp }
      )
    ).toBe(false);
  });
});

describe('parseJUnitTestsuites / mergeJunitSuiteMaps', () => {
  it('parsea múltiples <testsuite> de un XML real de vitest', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<testsuites name="vitest tests" tests="16" failures="1">
  <testsuite name="src/services/encryption.test.ts" tests="12" failures="0" errors="0" skipped="0" time="0.98">
  </testsuite>
  <testsuite name="src/routes/auth.test.ts" tests="4" failures="1" errors="0" skipped="0" time="0.08">
  </testsuite>
</testsuites>`;
    const result = parseJUnitTestsuites(xml);
    expect(result['src/services/encryption.test.ts']).toEqual({ tests: 12, failures: 0 });
    expect(result['src/routes/auth.test.ts']).toEqual({ tests: 4, failures: 1 });
  });

  it('mergeJunitSuiteMaps combina varios shards en un solo mapa', () => {
    const shard1 = { 'a.test.ts': { tests: 1, failures: 0 } };
    const shard2 = { 'b.test.ts': { tests: 2, failures: 1 } };
    const merged = mergeJunitSuiteMaps([shard1, shard2]);
    expect(merged).toEqual({
      'a.test.ts': { tests: 1, failures: 0 },
      'b.test.ts': { tests: 2, failures: 1 },
    });
  });
});

describe('Scenario 5 — generador puro (generateCertificationDashboard)', () => {
  const baseInput: DashboardInput = {
    backend: { passed: 10, total: 10 },
    frontend: { passed: 20, total: 20 },
    db: 'PASSED',
    tsc: { errors: 0, warnings: 0 },
    e2e: 'PASSED',
    sonar: 'PASSED',
    coverageMap: {
      A05: {
        label: 'Security Misconfiguration',
        method: 'junit',
        app: 'api',
        files: ['h.test.ts'],
      },
    },
    junitSuites: { api: { 'h.test.ts': { tests: 1, failures: 1 } }, web: {} },
    scriptResults: {},
  };

  it('A05 FAILED se refleja en el markdown con ❌, sin strings hardcodeados adicionales', () => {
    const md = generateCertificationDashboard(baseInput);
    expect(md).toContain('**A05** | Security Misconfiguration | ❌ FAILED');
    expect(md).toContain('NO CERTIFICADO');
  });

  it('todas PASSED produce CERTIFICADO en el TOTAL', () => {
    const md = generateCertificationDashboard({
      ...baseInput,
      junitSuites: { api: { 'h.test.ts': { tests: 1, failures: 0 } }, web: {} },
    });
    expect(md).toContain('**A05** | Security Misconfiguration | ✅ PASSED');
    expect(md).toContain('CERTIFICADO');
    expect(md).not.toContain('NO CERTIFICADO');
  });
});
