/* eslint-disable no-console */
/**
 * FC 094 F0/F1 — DC4: gate CI permanente contra código muerto reintroducido.
 *
 * eslint-plugin-import's no-unused-modules es incompatible con el flat config
 * de ESLint 9 de este repo (issue upstream — exige un .eslintrc legacy que
 * FC083 retiró a propósito), y ts-prune no está instalado. Mismo patrón ya
 * establecido en este proyecto para chequeos que ESLint no cubre nativamente
 * (checkNoRawSql.ts, dependencyAuditGate.ts): script propio + ALLOWLIST
 * auditable, alta/baja solo vía FC firmado.
 *
 * Heurística textual dominio-finito (no AST): extrae exports de VALOR en
 * tiempo de ejecución (function/class/const/let/var) — interface/type/enum
 * quedan fuera a propósito, su "uso" es con frecuencia inferido por el
 * compilador y no referenciado textualmente (falsos positivos masivos,
 * verificado en la auditoría de 094_evidence/f0/dead_code_inventory.md).
 * Un export sin ninguna referencia fuera de su propio archivo (ni en
 * producto, ni interna al mismo archivo) es candidato — ALLOWLIST/IGNORED
 * cubren las excepciones ya triadas (Grupo A DORMANT-G1+, Grupo D seeds).
 *
 * CLI: `bun scripts/checkDeadExports.ts` — exit 0 = sin huérfanos nuevos ·
 * exit 1 = hallazgo(s) no listado(s). Funciones puras exportadas para tests
 * (Regla 19 · R-BDD-GHERKIN).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const RED = '[31m';
const GREEN = '[32m';
const RESET = '[0m';

export interface DeadExportFinding {
  file: string;
  name: string;
}

export interface AllowlistEntry {
  file: string;
  symbol: string;
  reason: string;
}

const VALUE_EXPORT_PATTERN =
  /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;

/** Nombres de exports de valor (`function`/`class`/`const`/`let`/`var`) en `content` — `interface`/`type`/`enum` quedan fuera a propósito (ver cabecera). */
export function extractValueExports(content: string): string[] {
  return Array.from(content.matchAll(VALUE_EXPORT_PATTERN))
    .map((match) => match[1])
    .filter((name) => name.length >= 3);
}

function normalizePath(p: string): string {
  return p.replaceAll('\\', '/');
}

function isEntrypoint(file: string): boolean {
  return /\/(index|main)\.(ts|tsx)$/.test(normalizePath(file));
}

/** Non-global test — `.test()` on a `g`-flagged regex is stateful across
 * calls (lastIndex) and would silently miss matches when reused over
 * multiple strings, as this function is. */
function containsWord(content: string, name: string): boolean {
  return new RegExp(String.raw`\b${name}\b`).exec(content) !== null;
}

/** Separate global-flagged instance, only ever `.match()`ed once per call —
 * counting occurrences needs `g`, existence checks (containsWord) must not
 * share this instance. */
function countWordOccurrences(content: string, name: string): number {
  return (content.match(new RegExp(String.raw`\b${name}\b`, 'g')) || []).length;
}

/**
 * Exports de `productFiles` sin ningún consumidor fuera de su propio archivo.
 * Reserved for future use: test-only usage does not clear a finding on its
 * own (Bravo, FC094 F0: "solo tests != vivo en producto") -- allowlisted
 * explicitly instead, see ALLOWLIST below.
 */
export function findDeadExports(
  productFiles: Record<string, string>,
  _testFiles: Record<string, string> = {}
): DeadExportFinding[] {
  const findings: DeadExportFinding[] = [];
  const entries = Object.entries(productFiles);

  entries.forEach(([file, content]) => {
    if (isEntrypoint(file)) return;
    extractValueExports(content).forEach((name) => {
      const usedElsewhereInProduct = entries.some(
        ([otherFile, otherContent]) => otherFile !== file && containsWord(otherContent, name)
      );
      if (usedElsewhereInProduct) return;

      const ownFileHits = countWordOccurrences(content, name);
      if (ownFileHits > 1) return; // used internally (e.g. by its own route handler)

      findings.push({ file: normalizePath(file), name });
    });
  });

  return findings;
}

export const IGNORED_DIRS: readonly string[] = [
  // FC094 F0 Grupo D: fixtures de prueba intencionales confirmadas por Ω
  // (2026-08-03, "todos los seeds... son pruebas, el sistema no tiene datos
  // reales") -- consumidas solo por su propia suite de integridad
  // (seedingA/B/C.test.ts), sin pipeline de siembra real. Ver
  // protocols/analysis/094_evidence/f0/dead_code_inventory.md Grupo D.
  'apps/api/src/scripts/seeding',
];

export const ALLOWLIST: readonly AllowlistEntry[] = [
  {
    file: 'apps/api/src/utils/ownerHandle.ts',
    symbol: 'resolveUniqueHandle',
    reason:
      'FC094 F0 Grupo A -- huerfano desde que onboarding.ts se gutteo a guard 501 en F3c3. ' +
      'DORMANT-G1+: sin consumidor hoy, reservado para el rediseno del alta publica en G1+.',
  },
  {
    file: 'apps/api/src/services/universeBootstrap.ts',
    symbol: 'designateMasterOfUniverse',
    reason: 'FC094 F0 Grupo A -- mismo origen y misma clasificacion que resolveUniqueHandle.',
  },
  {
    file: 'apps/api/src/constants/statuses.ts',
    symbol: 'MOVEMENT_TYPE',
    reason:
      'FC094 F0 Grupo B(SSOT) -- constante de la "single source of truth" de statuses declarada ' +
      'pero aun no adoptada por el codigo real (sus vecinas UNIT_STATUS/MOVEMENT_STATUS si se usan). ' +
      'DORMANT-G1+, no huerfana sin proposito -- ver dead_code_inventory.md.',
  },
  {
    file: 'apps/api/src/constants/statuses.ts',
    symbol: 'INCIDENT_STATUS',
    reason: 'FC094 F0 Grupo B(SSOT) -- mismo caso que MOVEMENT_TYPE.',
  },
  {
    file: 'apps/web/src/test/globalTeardown.ts',
    symbol: 'teardown',
    reason:
      'Wireado por configuracion en apps/web/vite.config.ts (globalTeardown), no por import de ' +
      'TypeScript -- vivo, falso positivo de la heuristica textual (no detecta wiring de config).',
  },
  // FC094 F0/F1 (2026-08-03): los siguientes son helpers internos usados por
  // su propio handler/componente en el mismo archivo, exportados unicamente
  // para que su .test.ts los ejercite de forma aislada -- mismo patron ya
  // establecido en este repo (validateRoleIdUpdate/syncGrayManCosmonautAssignment,
  // extraidos en F3c1). No son codigo muerto; "solo tests" aqui es el proposito
  // deliberado del export, no un sintoma de orfandad.
  {
    file: 'apps/api/src/constants/recalls.ts',
    symbol: 'isValidRecallStatus',
    reason: 'Helper interno probado en recalls.test.ts -- usado por su propio modulo.',
  },
  {
    file: 'apps/api/src/routes/alerts.ts',
    symbol: 'meetsMaintenanceKmCriteria',
    reason: 'Helper interno del handler de alerts, probado en alerts.test.ts.',
  },
  {
    file: 'apps/api/src/services/auditService.ts',
    symbol: 'getEntityAuditHistory',
    reason: 'Probado directo en forensicIntegrity.test.ts.',
  },
  {
    file: 'apps/api/src/services/notificationsOutboxService.ts',
    symbol: 'purgeOutboxByType',
    reason: 'Probado directo en notificationsOutboxService.test.ts.',
  },
  {
    file: 'apps/api/src/services/outboundFetch.ts',
    symbol: 'resetOutboundState',
    reason: 'Utilidad de reset entre tests, probada en outboundFetch.test.ts.',
  },
  {
    file: 'apps/api/src/services/runMigration073.ts',
    symbol: 'runMigration073',
    reason: 'Runner de migracion historica, probado en forensicIntegrity.test.ts.',
  },
  {
    file: 'apps/api/src/services/securityLog.ts',
    symbol: 'resetSecurityMetrics',
    reason:
      'Utilidad de reset entre tests, probada en 3 suites (securityObservability/outboundFetch/securityLog).',
  },
  {
    file: 'apps/api/src/services/universeBootstrap.ts',
    symbol: 'resetBootstrapSchemaCache',
    reason: 'Utilidad de reset entre tests, probada en universeBootstrap.test.ts.',
  },
  {
    file: 'apps/api/src/utils/mappers.ts',
    symbol: 'toSnakeCase',
    reason: 'Probado en fleet.test.ts/fleetCertification.test.ts.',
  },
  {
    file: 'apps/api/src/utils/mappers.ts',
    symbol: 'toCamelCase',
    reason: 'Probado en fleet.test.ts.',
  },
  {
    file: 'apps/web/src/components/ArchonSkeleton.tsx',
    symbol: 'ArchonCardSkeleton',
    reason: 'Probado en ArchonSkeleton.test.tsx.',
  },
  {
    file: 'apps/web/src/components/Auth/PermissionGate.tsx',
    symbol: 'PermissionGate',
    reason: 'Probado en PermissionGate.test.tsx.',
  },
  {
    file: 'apps/web/src/components/Users/UserRegistrationForm.tsx',
    symbol: 'buildTempPassword',
    reason: 'Helper interno del formulario, probado en UserRegistrationForm.test.tsx.',
  },
  {
    file: 'apps/web/src/constants/versionConstants.ts',
    symbol: 'BRANDING_NAME',
    reason: 'Probado en versionConstants.test.ts.',
  },
  {
    file: 'apps/web/src/pages/Dashboard/nodes/NodeShared.tsx',
    symbol: 'NodeBackLink',
    reason: 'Probado en NodeShared.test.tsx.',
  },
  {
    file: 'apps/web/src/utils/ArchonIncentiveEngine.ts',
    symbol: 'calculateIncentive',
    reason: 'Probado en ArchonIncentiveEngine.test.ts.',
  },
  {
    file: 'apps/web/src/utils/ArchonIncentiveEngine.ts',
    symbol: 'getPerformanceColor',
    reason: 'Probado en ArchonIncentiveEngine.test.ts.',
  },
  {
    file: 'apps/web/src/utils/exportUtils.ts',
    symbol: 'buildCsv',
    reason: 'Funcion publica de exportacion CSV (FC041 FaseE), probada en exportUtils.test.ts.',
  },
];

/** `true` si `finding` cae en `IGNORED_DIRS` o está listado en `ALLOWLIST`. */
export function isIgnored(finding: DeadExportFinding): boolean {
  if (IGNORED_DIRS.some((dir) => finding.file.startsWith(`${dir}/`))) return true;
  return ALLOWLIST.some((e) => e.file === finding.file && e.symbol === finding.name);
}

/** `findings` sin lo ya cubierto por `IGNORED_DIRS`/`ALLOWLIST` — lo que debe bloquear CI. */
export function filterNewFindings(findings: DeadExportFinding[]): DeadExportFinding[] {
  return findings.filter((f) => !isIgnored(f));
}

function walk(dir: string, out: string[] = []): string[] {
  readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'coverage'].includes(entry.name)) return;
      walk(full, out);
      return;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  });
  return out;
}

/* v8 ignore start */
if (import.meta.main) {
  const roots = [
    join(import.meta.dir, '../apps/api/src'),
    join(import.meta.dir, '../apps/web/src'),
  ];
  const productFiles: Record<string, string> = {};
  const testFiles: Record<string, string> = {};
  roots.forEach((root) => {
    walk(root).forEach((f) => {
      const rel = normalizePath(relative(process.cwd(), f));
      const content = readFileSync(f, 'utf8');
      if (/\.(test|spec)\.(ts|tsx)$/.test(f)) {
        testFiles[rel] = content;
      } else {
        productFiles[rel] = content;
      }
    });
  });

  const findings = findDeadExports(productFiles, testFiles);
  const newFindings = filterNewFindings(findings);

  if (newFindings.length > 0) {
    console.error(
      `${RED}[FAIL]${RESET} DC4 dead-exports -- ${newFindings.length} export(s) sin consumidor NO listado(s) en ALLOWLIST/IGNORED_DIRS:`
    );
    newFindings.forEach((f) => console.error(`  ${f.file} :: ${f.name}`));
    console.error(
      '\nAlta/baja del ALLOWLIST/IGNORED_DIRS solo vía FC firmado (mismo principio que checkNoRawSql.ts).'
    );
    process.exit(1);
  }
  console.log(
    `${GREEN}[OK]${RESET} DC4 dead-exports -- ${
      findings.length
    } hallazgo(s) totales, todos en ALLOWLIST/IGNORED_DIRS auditado. ${
      Object.keys(productFiles).length
    } archivo(s) de producto escaneados.`
  );
}
/* v8 ignore stop */
