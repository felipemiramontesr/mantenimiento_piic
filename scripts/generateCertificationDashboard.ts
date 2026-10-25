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
 *
 * FC222 F2 (D39) — fila `Dependabot Security & Supply Chain`: lee por la API de GitHub las
 * alertas abiertas de Dependabot (`vulnerability-alerts: read`) y sus PR abiertos
 * (`pull-requests: read`, `checks: read`). Una alerta abierta de cualquier severidad la pone en
 * FAILED el mismo día; un PR de Dependabot en fallo o en conflicto solo la tumba pasados 7 días.
 * Sin lectura posible queda NO VERIFICADO, que también bloquea (fail-closed). La vista previa de
 * Hostinger no entra en ningún predicado (R-PREVIEW-OUT-OF-GATE).
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

export interface DependabotPr {
  number: number;
  ageDays: number;
  failing: boolean;
}

/** Señal leída de GitHub; null cuando no se pudo leer (token, permiso o red). */
export interface DependabotSignal {
  openAlerts: number;
  prs: DependabotPr[];
}

export interface DashboardInput {
  backend: PlatformSignal;
  frontend: PlatformSignal;
  db: PlatformStatus;
  tsc: { errors: number; warnings: number };
  e2e: PlatformStatus;
  sonar: PlatformStatus;
  dependabot: DependabotSignal | null;
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
// FC222 F2 · T2 (S) — fila Dependabot: alerta abierta ⇒ FAILED el mismo día; PR en fallo o
// conflicto ⇒ FAILED solo con más de DEPENDABOT_PR_SLA_DAYS días.
// ---------------------------------------------------------------------------

export const DEPENDABOT_PR_SLA_DAYS = 7;

const FAILING_CONCLUSIONS = new Set(['failure', 'timed_out', 'action_required', 'startup_failure']);

/** Días completos transcurridos desde `createdAt` hasta `now`. */
export function ageInDays(createdAt: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86_400_000);
}

/** Un PR falla si GitHub lo marca en conflicto (`dirty`) o algún check terminó en fallo. */
export function isFailingPr(
  mergeableState: string | null,
  conclusions: (string | null)[]
): boolean {
  return (
    mergeableState === 'dirty' || conclusions.some((c) => c !== null && FAILING_CONCLUSIONS.has(c))
  );
}

/** PR de Dependabot en fallo o conflicto que ya rebasaron el plazo de 7 días. */
export function overdueFailingPrs(signal: DependabotSignal): DependabotPr[] {
  return signal.prs.filter((pr) => pr.failing && pr.ageDays > DEPENDABOT_PR_SLA_DAYS);
}

/** Estado de la fila Dependabot: sin alertas abiertas ni PR vencidos ⇒ PASSED; sin lectura ⇒ NO VERIFICADO. */
export function computeDependabotStatus(signal: DependabotSignal | null): PlatformStatus {
  if (signal === null) return 'NO VERIFICADO';
  return signal.openAlerts === 0 && overdueFailingPrs(signal).length === 0 ? 'PASSED' : 'FAILED';
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
  dependabot: PlatformStatus,
  owaspResults: Record<string, CategoryStatus>
): boolean {
  const backendOk = backend.total > 0 && backend.passed === backend.total;
  const frontendOk = frontend.total > 0 && frontend.passed === frontend.total;
  const dbOk = db === 'PASSED';
  const e2eOk = e2e === 'PASSED';
  const sonarOk = sonar === 'PASSED';
  const dependabotOk = dependabot === 'PASSED';
  const owaspOk = Object.values(owaspResults).every((s) => s === 'PASSED');
  return backendOk && frontendOk && dbOk && e2eOk && sonarOk && dependabotOk && owaspOk;
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

/** GlobalCertificationPass sobre el input completo (lo usan el generador y el CLI). */
export function computeDashboardPass(input: DashboardInput): boolean {
  return computeGlobalCertificationPass(
    input.backend,
    input.frontend,
    input.db,
    input.e2e,
    input.sonar,
    computeDependabotStatus(input.dependabot),
    computeOwaspResults(input.coverageMap, input.junitSuites, input.scriptResults)
  );
}

function dependabotDetail(signal: DependabotSignal | null): string {
  if (signal === null) return 'sin lectura de GitHub';
  const overdue = overdueFailingPrs(signal).length;
  return `${signal.openAlerts} alertas abiertas · ${overdue} PR vencidos (> ${DEPENDABOT_PR_SLA_DAYS} días)`;
}

function platformRows(input: DashboardInput, globalPass: boolean): string[] {
  const totalPassed = input.backend.passed + input.frontend.passed;
  const totalTests = input.backend.total + input.frontend.total;
  return [
    `| 🛡️ Backend API | ${
      input.backend.passed === input.backend.total ? '✅ PASSED' : '❌ FAILED'
    } | ${input.backend.passed} / ${input.backend.total} | ${integrityPct(input.backend)}% |`,
    `| 🎨 Frontend Web | ${
      input.frontend.passed === input.frontend.total ? '✅ PASSED' : '❌ FAILED'
    } | ${input.frontend.passed} / ${input.frontend.total} | ${integrityPct(input.frontend)}% |`,
    `| 🏷️ Static Type Checking | ${input.tsc.errors === 0 ? '✅ PASSED' : '❌ FAILED'} | ${
      input.tsc.errors
    } Errors / ${input.tsc.warnings} Warnings | ${input.tsc.errors === 0 ? 100 : 0}% |`,
    `| 🗄️ Database (SQL) | ${statusEmoji(input.db)} | — | — |`,
    `| 🧪 E2E (Playwright) | ${statusEmoji(input.e2e)} | — | — |`,
    `| 🔍 SonarQube Quality Gate | ${statusEmoji(input.sonar)} | — | — |`,
    `| 🤖 Dependabot Security & Supply Chain | ${statusEmoji(
      computeDependabotStatus(input.dependabot)
    )} | ${dependabotDetail(input.dependabot)} | — |`,
    `| **TOTAL** | **${
      globalPass ? 'CERTIFICADO' : 'NO CERTIFICADO'
    }** | **${totalPassed} / ${totalTests}** | **${globalPass ? 100 : 0}%** |`,
  ];
}

function owaspRows(input: DashboardInput): string[] {
  const owaspResults = computeOwaspResults(
    input.coverageMap,
    input.junitSuites,
    input.scriptResults
  );
  return OWASP_DOMAIN_ORDER.flatMap((cat) => {
    const entry = input.coverageMap[cat];
    if (entry === undefined) return [];
    return [`| **${cat}** | ${entry.label} | ${statusEmoji(owaspResults[cat])} |`];
  });
}

/** Markdown del «Archon Global Certification» a partir de señales computadas (cero texto fijo de estado). */
export function generateCertificationDashboard(input: DashboardInput): string {
  return [
    '### 🔱 ARCHON CERTIFICATION DASHBOARD',
    '',
    '| Módulo | Estado | Tests Pasados | Integridad |',
    '| :--- | :---: | :---: | :---: |',
    ...platformRows(input, computeDashboardPass(input)),
    '',
    '### 🛡️ OWASP SECURITY CERTIFICATION (TOP 10)',
    '',
    '| Categoría | Riesgo | Estado |',
    '| :--- | :--- | :---: |',
    ...owaspRows(input),
  ].join('\n');
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

const DEPENDABOT_LOGIN = 'dependabot[bot]';

async function githubGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) throw new Error(`GitHub ${path} → HTTP ${response.status}`);
  return (await response.json()) as T;
}

interface GithubPull {
  number: number;
  created_at: string;
  user: { login: string };
  head: { sha: string };
}

async function readDependabotPr(
  repo: string,
  token: string,
  pr: GithubPull,
  now: Date
): Promise<DependabotPr> {
  const detail = await githubGet<{ mergeable_state: string | null }>(
    `/repos/${repo}/pulls/${pr.number}`,
    token
  );
  const checks = await githubGet<{ check_runs: { conclusion: string | null }[] }>(
    `/repos/${repo}/commits/${pr.head.sha}/check-runs?per_page=100`,
    token
  );
  return {
    number: pr.number,
    ageDays: ageInDays(pr.created_at, now),
    failing: isFailingPr(
      detail.mergeable_state,
      checks.check_runs.map((run) => run.conclusion)
    ),
  };
}

/** Lee alertas abiertas y PR de Dependabot; null si falta token o la API rechaza la lectura. */
async function readDependabotSignal(): Promise<DependabotSignal | null> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) return null;
  try {
    const now = new Date();
    const alerts = await githubGet<unknown[]>(
      `/repos/${repo}/dependabot/alerts?state=open&per_page=100`,
      token
    );
    const pulls = await githubGet<GithubPull[]>(
      `/repos/${repo}/pulls?state=open&per_page=100`,
      token
    );
    const prs = await Promise.all(
      pulls
        .filter((pr) => pr.user.login === DEPENDABOT_LOGIN)
        .map((pr) => readDependabotPr(repo, token, pr, now))
    );
    return { openAlerts: alerts.length, prs };
  } catch (error) {
    console.error(`[Dependabot] sin lectura — fila NO VERIFICADO (fail-closed): ${String(error)}`);
    return null;
  }
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
    dependabot: await readDependabotSignal(),
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

  if (!computeDashboardPass(input)) process.exit(1);
}
/* v8 ignore stop */
