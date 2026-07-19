/* eslint-disable no-console */
/**
 * FC 069 F1 — A03_Injection_Static_Verification.
 * Chequeo estático dominio-finito: ∀ call-site db.execute|db.query en
 * apps/api/src/**, ninguno construye el string SQL por template-literal con
 * interpolación directa (`...${x}...`) sin figurar en el ALLOWLIST auditable
 * (Libro II §6.1 Acceso Directo Parametrizado, Libro VIII §23.2 Cero ORMs).
 *
 * Terreno (2026-07-09): el escaneo real encontró 9 call-sites con
 * interpolación — los 9 verificados manualmente son el patrón seguro
 * establecido en el proyecto: fragmentos `columna = ?` fijos empujados
 * condicionalmente a `fields[]` (SET dinámico) o strings de placeholders
 * `?` generados por `.map(() => '?').join(',')` (IN dinámico) — el dato
 * real del usuario siempre viaja parametrizado en el array de valores.
 * Ninguno interpola directamente un valor de usuario dentro del literal SQL.
 * Quedan en el ALLOWLIST con su razón; el gate falla ante cualquier
 * call-site NUEVO no listado (alta/baja del ALLOWLIST solo vía FC firmado,
 * mismo principio que ExclusionSet de cobertura — 052 §I-9).
 *
 * Heurística textual, no AST: capta el patrón peligroso más común (literal
 * SQL construido inline con interpolación) sin falsos positivos sobre
 * placeholders `?` legítimos. Limitación declarada: no captura interpolación
 * vía variable intermedia construida en múltiples pasos antes de la llamada.
 *
 * CLI: `bun scripts/checkNoRawSql.ts` — exit 0 = sin violaciones nuevas · exit 1 = hallazgo(s).
 * Consumido por CI (deploy.yml, categoría A03) y pre-flight manual.
 * Funciones puras exportadas para tests (Regla 19 · R-BDD-GHERKIN).
 */
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const RED = '[31m';
const GREEN = '[32m';
const RESET = '[0m';

export interface RawSqlViolation {
  file: string;
  line: number;
  snippet: string;
}

export interface AllowlistEntry {
  file: string;
  snippetIncludes: string;
  reason: string;
}

const RAW_SQL_PATTERN = /\.(execute|query)\s*\(\s*`[^`]*\$\{/;

export function findRawSqlViolations(fileContents: Record<string, string>): RawSqlViolation[] {
  const violations: RawSqlViolation[] = [];
  Object.entries(fileContents).forEach(([file, content]) => {
    content.split('\n').forEach((lineText, index) => {
      if (RAW_SQL_PATTERN.test(lineText)) {
        violations.push({ file, line: index + 1, snippet: lineText.trim() });
      }
    });
  });
  return violations;
}

function normalizePath(p: string): string {
  return p.replaceAll('\\', '/');
}

export function isAllowlisted(violation: RawSqlViolation, allowlist: AllowlistEntry[]): boolean {
  return allowlist.some(
    (entry) =>
      normalizePath(entry.file) === normalizePath(violation.file) &&
      violation.snippet.includes(entry.snippetIncludes)
  );
}

export function filterNewViolations(
  violations: RawSqlViolation[],
  allowlist: AllowlistEntry[]
): RawSqlViolation[] {
  return violations.filter((v) => !isAllowlisted(v, allowlist));
}

export function collectScannableFiles(rootDir: string): string[] {
  const results: string[] = [];
  const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'coverage', 'scratch']);
  const walk = (dir: string): void => {
    readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) return;
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        results.push(fullPath);
      }
    });
  };
  walk(rootDir);
  return results;
}

export const ALLOWLIST: AllowlistEntry[] = [
  {
    file: 'apps/api/src/routes/admin.ts',
    snippetIncludes: 'UPDATE roles SET',
    reason:
      'fields[] son fragmentos fijos `col = ?` empujados condicionalmente; valores reales parametrizados en values[].',
  },
  {
    file: 'apps/api/src/routes/auth.ts',
    snippetIncludes: 'UPDATE users SET',
    reason: 'Mismo patrón SET dinámico seguro que admin.ts — valores en values[] parametrizados.',
  },
  {
    file: 'apps/api/src/routes/crmContracts.ts',
    snippetIncludes: 'UPDATE crm_contracts SET',
    reason: 'Mismo patrón SET dinámico seguro — setClauses[] son fragmentos fijos `col = ?`.',
  },
  {
    file: 'apps/api/src/routes/fleetMaintenance.ts',
    snippetIncludes: 'UPDATE fleet_units SET',
    reason:
      'Mismo patrón SET dinámico seguro — setClause construido de fragmentos fijos `col = ?`.',
  },
  {
    file: 'apps/api/src/services/fleetService.ts',
    snippetIncludes: 'UPDATE fleet_units SET',
    reason:
      'Mismo patrón SET dinámico seguro — setClause construido de fragmentos fijos `col = ?`.',
  },
  {
    file: 'apps/api/src/services/db.ts',
    snippetIncludes: 'SET time_zone',
    reason: 'MEXICO_TZ_OFFSET es constante hardcodeada (-06:00), no input de usuario.',
  },
];

/* v8 ignore start */
if (import.meta.main) {
  const rootDir = join(import.meta.dir, '../apps/api/src');
  const files = collectScannableFiles(rootDir);
  const fileContents: Record<string, string> = {};
  files.forEach((f) => {
    fileContents[normalizePath(relative(process.cwd(), f))] = readFileSync(f, 'utf8');
  });
  const violations = findRawSqlViolations(fileContents);
  const newViolations = filterNewViolations(violations, ALLOWLIST);
  if (newViolations.length > 0) {
    console.error(
      `${RED}[FAIL]${RESET} A03 Injection — ${newViolations.length} call-site(s) NO listado(s) en ALLOWLIST:`
    );
    newViolations.forEach((v) => console.error(`  ${v.file}:${v.line} -> ${v.snippet}`));
    process.exit(1);
  }
  console.log(
    `${GREEN}[OK]${RESET} A03 Injection — ${violations.length} call-site(s) con interpolación, todos en ALLOWLIST auditado. ${files.length} archivo(s) escaneados.`
  );
}
/* v8 ignore stop */
