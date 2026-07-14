/* eslint-disable no-console */
/**
 * FC 069 F1+F4 — Ci_Certification_Dashboard_Truth.
 * Función pura que consume únicamente señales computadas (JUnit real, exit
 * codes de scripts, Quality Gate de Sonar) y produce el markdown del
 * "Archon Global Certification" summary — cero strings de estado escritos a
 * mano. T1: CategoryStatus(cat) = PASSED solo si su(s) test(s)/script mapeado
 * en owaspCoverageMap.json existen Y pasan; si no hay mapeo, NO VERIFICADO
 * (nunca PASSED sin evidencia). T2 (enmienda v1.1, cero tolerancia de Ω):
 * GlobalCertificationPass exige TODAS las categorías en PASSED.
 * CLI: `bun scripts/generateCertificationDashboard.ts [all-results-dir]` — ensambla
 * el input real (shards JUnit descargados + tsc-result.json + env de jobs
 * dependientes + exit codes de A03/A06) e imprime el markdown a stdout
 * (consumido por deploy.yml vía `>> $GITHUB_STEP_SUMMARY`). Exit 1 si
 * GlobalCertificationPass ≡ ⊥ — bloquea `hostinger-deployment` (needs:).
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export type CategoryStatus = 'PASSED' | 'FAILED' | 'NO VERIFICADO';
export type PlatformStatus = 'PASSED' | 'FAILED' | 'NO VERIFICADO';

export interface PlatformSignal {
  passed: number;
  total: number;
}

export interface JunitSuiteResult {
  tests: number;
  failures: number;
}

export interface JunitSuiteMaps {
  api: Record<string, JunitSuiteResult>;
  web: Record<string, JunitSuiteResult>;
}

export interface OwaspCategoryEntry {
  label: string;
  method: 'junit' | 'script';
  app?: 'api' | 'web';
  files?: string[];
  script?: string;
}

export type OwaspCoverageMap = Record<string, OwaspCategoryEntry>;

export interface DashboardInput {
  backend: PlatformSignal;
  frontend: PlatformSignal;
  db: PlatformStatus;
  tsc: { errors: number; warnings: number };
  e2e: PlatformStatus;
  sonar: PlatformStatus;
  coverageMap: OwaspCoverageMap;
  junitSuites: JunitSuiteMaps;
  scriptResults: Record<string, boolean>;
}

const OWASP_DOMAIN_ORDER = [
  'A01',
  'A02',
  'A03',
  'A04',
  'A05',
  'A06',
  'A07',
  'A08',
  'A09',
  'A10',
  'ArchonALE',
];

// ---------------------------------------------------------------------------
// Parsing de JUnit XML (regex ligero — sin dependencia nueva de XML parser)
// ---------------------------------------------------------------------------

function extractAttr(tag: string, name: string): string | undefined {
  const m = new RegExp(`${name}="([^"]*)"`).exec(tag);
  return m?.[1];
}

function decodeXmlEntities(s: string): string {
  return s
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

export function parseJUnitTestsuites(xml: string): Record<string, JunitSuiteResult> {
  const result: Record<string, JunitSuiteResult> = {};
  const tagRegex = /<testsuite\s+([^>]*)>/g;
  let match: RegExpExecArray | null = tagRegex.exec(xml);
  while (match !== null) {
    const attrs = match[1];
    const name = extractAttr(attrs, 'name');
    const tests = Number(extractAttr(attrs, 'tests') ?? '0');
    const failures = Number(extractAttr(attrs, 'failures') ?? '0');
    if (name !== undefined) {
      result[decodeXmlEntities(name)] = { tests, failures };
    }
    match = tagRegex.exec(xml);
  }
  return result;
}

export function mergeJunitSuiteMaps(
  maps: Record<string, JunitSuiteResult>[]
): Record<string, JunitSuiteResult> {
  const merged: Record<string, JunitSuiteResult> = {};
  maps.forEach((m) => {
    Object.entries(m).forEach(([name, result]) => {
      merged[name] = result;
    });
  });
  return merged;
}

// ---------------------------------------------------------------------------
// T1 — CategoryStatus(cat) : A = MappedTestExists(cat) · B = AllMappedTestsPassed(cat)
// ---------------------------------------------------------------------------

export function computeCategoryStatus(
  entry: OwaspCategoryEntry,
  junitSuites: JunitSuiteMaps,
  scriptResults: Record<string, boolean>
): CategoryStatus {
  if (entry.method === 'script') {
    const result = entry.script !== undefined ? scriptResults[entry.script] : undefined;
    if (result === undefined) return 'NO VERIFICADO';
    return result ? 'PASSED' : 'FAILED';
  }

  const suiteMap = entry.app === 'web' ? junitSuites.web : junitSuites.api;
  const files = entry.files ?? [];
  if (files.length === 0) return 'NO VERIFICADO';

  const results = files.map((f) => suiteMap[f]);
  const mappedTestExists = results.every((r) => r !== undefined);
  if (!mappedTestExists) return 'NO VERIFICADO';

  const allPassed = results.every((r) => r!.failures === 0);
  return allPassed ? 'PASSED' : 'FAILED';
}

export function computeOwaspResults(
  coverageMap: OwaspCoverageMap,
  junitSuites: JunitSuiteMaps,
  scriptResults: Record<string, boolean>
): Record<string, CategoryStatus> {
  const result: Record<string, CategoryStatus> = {};
  Object.entries(coverageMap).forEach(([cat, entry]) => {
    result[cat] = computeCategoryStatus(entry, junitSuites, scriptResults);
  });
  return result;
}

// ---------------------------------------------------------------------------
// T2 — GlobalCertificationPass (enmienda v1.1: cero tolerancia a NO VERIFICADO)
// ---------------------------------------------------------------------------

export function computeGlobalCertificationPass(
  backend: PlatformSignal,
  frontend: PlatformSignal,
  db: PlatformStatus,
  e2e: PlatformStatus,
  sonar: PlatformStatus,
  owaspResults: Record<string, CategoryStatus>
): boolean {
  const backendOk = backend.total > 0 && backend.passed === backend.total;
  const frontendOk = frontend.total > 0 && frontend.passed === frontend.total;
  const dbOk = db === 'PASSED';
  const e2eOk = e2e === 'PASSED';
  const sonarOk = sonar === 'PASSED';
  const owaspOk = Object.values(owaspResults).every((s) => s === 'PASSED');
  return backendOk && frontendOk && dbOk && e2eOk && sonarOk && owaspOk;
}

// ---------------------------------------------------------------------------
// Generador de markdown
// ---------------------------------------------------------------------------

function statusEmoji(status: PlatformStatus): string {
  if (status === 'PASSED') return '✅ PASSED';
  if (status === 'FAILED') return '❌ FAILED';
  return '⚠️ NO VERIFICADO';
}

function integrityPct(signal: PlatformSignal): number {
  if (signal.total === 0) return 0;
  return Math.round((signal.passed / signal.total) * 100);
}

export function generateCertificationDashboard(input: DashboardInput): string {
  const owaspResults = computeOwaspResults(
    input.coverageMap,
    input.junitSuites,
    input.scriptResults
  );
  const globalPass = computeGlobalCertificationPass(
    input.backend,
    input.frontend,
    input.db,
    input.e2e,
    input.sonar,
    owaspResults
  );

  const lines: string[] = [];
  lines.push('### 🔱 ARCHON CERTIFICATION DASHBOARD');
  lines.push('');
  lines.push('| Módulo | Estado | Tests Pasados | Integridad |');
  lines.push('| :--- | :---: | :---: | :---: |');
  lines.push(
    `| 🛡️ Backend API | ${
      input.backend.passed === input.backend.total ? '✅ PASSED' : '❌ FAILED'
    } | ${input.backend.passed} / ${input.backend.total} | ${integrityPct(input.backend)}% |`
  );
  lines.push(
    `| 🎨 Frontend Web | ${
      input.frontend.passed === input.frontend.total ? '✅ PASSED' : '❌ FAILED'
    } | ${input.frontend.passed} / ${input.frontend.total} | ${integrityPct(input.frontend)}% |`
  );
  lines.push(
    `| 🏷️ Static Type Checking | ${input.tsc.errors === 0 ? '✅ PASSED' : '❌ FAILED'} | ${
      input.tsc.errors
    } Errors / ${input.tsc.warnings} Warnings | ${input.tsc.errors === 0 ? 100 : 0}% |`
  );
  lines.push(`| 🗄️ Database (SQL) | ${statusEmoji(input.db)} | — | — |`);
  lines.push(`| 🧪 E2E (Playwright) | ${statusEmoji(input.e2e)} | — | — |`);
  lines.push(`| 🔍 SonarQube Quality Gate | ${statusEmoji(input.sonar)} | — | — |`);
  const totalPassed = input.backend.passed + input.frontend.passed;
  const totalTests = input.backend.total + input.frontend.total;
  lines.push(
    `| **TOTAL** | **${
      globalPass ? 'CERTIFICADO' : 'NO CERTIFICADO'
    }** | **${totalPassed} / ${totalTests}** | **${globalPass ? 100 : 0}%** |`
  );
  lines.push('');
  lines.push('### 🛡️ OWASP SECURITY CERTIFICATION (TOP 10)');
  lines.push('');
  lines.push('| Categoría | Riesgo | Estado |');
  lines.push('| :--- | :--- | :---: |');
  OWASP_DOMAIN_ORDER.forEach((cat) => {
    const entry = input.coverageMap[cat];
    if (entry === undefined) return;
    const status = owaspResults[cat];
    lines.push(`| **${cat}** | ${entry.label} | ${statusEmoji(status)} |`);
  });

  return lines.join('\n');
}

/* v8 ignore start */
function readShardXmls(allResultsDir: string, prefix: string): string[] {
  if (!existsSync(allResultsDir)) return [];
  return readdirSync(allResultsDir)
    .filter((name) => name.startsWith(prefix))
    .map((name) => join(allResultsDir, name, 'test-results.xml'))
    .filter((p) => existsSync(p))
    .map((p) => readFileSync(p, 'utf8'));
}

function readTscResult(
  allResultsDir: string,
  artifactName: string
): { errors: number; warnings: number } {
  const p = join(allResultsDir, artifactName, 'tsc-result.json');
  if (!existsSync(p)) return { errors: 0, warnings: 0 };
  return JSON.parse(readFileSync(p, 'utf8')) as { errors: number; warnings: number };
}

function totals(suites: Record<string, JunitSuiteResult>): PlatformSignal {
  return Object.values(suites).reduce(
    (acc, s) => ({ passed: acc.passed + (s.tests - s.failures), total: acc.total + s.tests }),
    { passed: 0, total: 0 }
  );
}

function jobResultToStatus(result: string | undefined): PlatformStatus {
  if (result === 'success') return 'PASSED';
  if (result === 'failure') return 'FAILED';
  return 'NO VERIFICADO';
}

function exitCodeToStatus(exitCode: string | undefined): boolean | undefined {
  if (exitCode === undefined) return undefined;
  return exitCode === '0';
}

if (import.meta.main) {
  const allResultsDir = process.argv[2] ?? 'all-results';

  const backendSuites = mergeJunitSuiteMaps(
    readShardXmls(allResultsDir, 'backend-results-shard-').map(parseJUnitTestsuites)
  );
  const frontendSuites = mergeJunitSuiteMaps(
    readShardXmls(allResultsDir, 'frontend-results-shard-').map(parseJUnitTestsuites)
  );

  const backendTsc = readTscResult(allResultsDir, 'backend-tsc-result');
  const frontendTsc = readTscResult(allResultsDir, 'frontend-tsc-result');

  const coverageMap = JSON.parse(
    readFileSync(join(import.meta.dir, 'owaspCoverageMap.json'), 'utf8')
  ) as OwaspCoverageMap;

  const input: DashboardInput = {
    backend: totals(backendSuites),
    frontend: totals(frontendSuites),
    db: jobResultToStatus(process.env.DB_RESULT),
    tsc: {
      errors: backendTsc.errors + frontendTsc.errors,
      warnings: backendTsc.warnings + frontendTsc.warnings,
    },
    e2e: jobResultToStatus(process.env.E2E_RESULT),
    sonar: jobResultToStatus(process.env.SONAR_RESULT),
    coverageMap,
    junitSuites: { api: backendSuites, web: frontendSuites },
    scriptResults: {
      'scripts/checkNoRawSql.ts': exitCodeToStatus(process.env.A03_EXIT) ?? false,
      'scripts/checkSecureDesignGates.ts': exitCodeToStatus(process.env.A04_EXIT) ?? false,
      'scripts/checkPipelineIntegrity.ts': exitCodeToStatus(process.env.A08_EXIT) ?? false,
      'scripts/dependencyAuditGate.ts': exitCodeToStatus(process.env.A06_EXIT) ?? false,
    },
  };

  const markdown = generateCertificationDashboard(input);
  console.log(markdown);

  const owaspResults = computeOwaspResults(
    input.coverageMap,
    input.junitSuites,
    input.scriptResults
  );
  const pass = computeGlobalCertificationPass(
    input.backend,
    input.frontend,
    input.db,
    input.e2e,
    input.sonar,
    owaspResults
  );
  if (!pass) process.exit(1);
}
/* v8 ignore stop */
