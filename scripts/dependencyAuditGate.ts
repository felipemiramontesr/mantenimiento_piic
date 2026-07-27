/* eslint-disable no-console */
/**
 * FC 062 F2 — A06_Dependency_Audit_Gate.
 * Fuente única del umbral T2: AuditPass ≡ (critical = 0) ∧ (high = 0).
 * Parser fail-closed sobre `bun audit --json` (forma: paquete → advisories[]):
 * severidad no reconocida cuenta como high; reporte malformado lanza y el CLI
 * sale con exit 1. Las advisories moderate/low se reportan pero no bloquean.
 * CLI: `bun scripts/dependencyAuditGate.ts` — exit 0 = PASS · exit 1 = FAIL.
 * Consumido por CI (deploy.yml, paso "Security Audit") y pre-flight manual.
 * Funciones puras exportadas para tests (Regla 19 · R-BDD-GHERKIN).
 *
 * FC083 H4 — Excepcion documentada y acotada (Solucion B, dictamen Bravo
 * 2026-07-26 18:11:56/22:25:24, tras descartar Solucion A -- bun patch rompe
 * resolucion transitiva, ver protocols/analysis/088_evidence/f2/
 * solucion_a_fallo_en_terreno.md). GHSA-mh99-v99m-4gvg (brace-expansion) no
 * tiene backport a la linea 1.x, y esa linea es dependencia interna de
 * eslint@9.39.5 (la mas reciente publicada) y de @eslint/eslintrc,
 * @eslint/config-array, eslint-plugin-import, eslint-plugin-react -- ninguna
 * version disponible de estos paquetes rompe esta cadena; forzar minimatch@10
 * rompe @eslint/eslintrc con un SyntaxError real (verificado empiricamente,
 * ver protocols/analysis/088_evidence/f2/hallazgos_finales_f2.md).
 * Condiciones Bravo (5/5): (1) allowlist exacta por advisory -- NO "toda
 * devDependency"; (2) ACCEPTED_EXCEPTIONS solo excluye ESTE advisory ID
 * exacto, cualquier otro (incl. brace-expansion bajo un CVE futuro distinto)
 * sigue bloqueando; (3) Kanban P1 -- reevaluar si eslint suelta minimatch@3.x
 * en un futuro release; (4) todo bump de eslint/plugins relacionados se loguea
 * en H/F; (5) prohibido ampliar esta allowlist sin O/R/Omega.
 */
import { spawnSync } from 'child_process';

const RED = '[31m';
const GREEN = '[32m';
const RESET = '[0m';

const KNOWN_SEVERITIES = ['critical', 'high', 'moderate', 'low', 'info'] as const;
type KnownSeverity = (typeof KNOWN_SEVERITIES)[number];

export interface SeverityCounts {
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
}

interface AcceptedException {
  packageName: string;
  advisoryId: number;
  reason: string;
  reviewBy: string;
}

// FC083 H4 Cond.1/5 (Bravo): allowlist exacta, un unico advisory ID, no
// ampliable sin FC firmado O/R/Omega.
export const ACCEPTED_EXCEPTIONS: readonly AcceptedException[] = [
  {
    packageName: 'brace-expansion',
    advisoryId: 1124334,
    reason:
      'eslint@9.39.5 (nucleo, ultima version publicada) + @eslint/eslintrc + ' +
      '@eslint/config-array + eslint-plugin-import + eslint-plugin-react ' +
      'dependen de minimatch@^3.1.x -> brace-expansion@1.x. Sin backport ' +
      'disponible (GHSA-mh99-v99m-4gvg); forzar minimatch@10 rompe ' +
      '@eslint/eslintrc (SyntaxError verificado). Solo devDependency de ' +
      'tooling, sin runtime de produccion.',
    reviewBy: '2026-10-26',
  },
];

function isAcceptedAdvisory(packageName: string, advisoryId: unknown): boolean {
  return ACCEPTED_EXCEPTIONS.some(
    (exception) => exception.packageName === packageName && exception.advisoryId === advisoryId
  );
}

export function countBySeverity(report: unknown): SeverityCounts {
  if (report === null || typeof report !== 'object' || Array.isArray(report)) {
    throw new TypeError('Reporte de auditoría malformado: se esperaba objeto paquete→advisories');
  }
  const counts: SeverityCounts = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };
  Object.entries(report as Record<string, unknown>).forEach(([packageName, advisories]) => {
    if (!Array.isArray(advisories)) {
      throw new TypeError('Reporte de auditoría malformado: advisories no es una lista');
    }
    advisories.forEach((advisory) => {
      const { severity, id } = advisory as { severity?: unknown; id?: unknown };
      const isKnown = KNOWN_SEVERITIES.includes(severity as KnownSeverity);
      // FC083 H4 Cond.2 (Bravo): el high solo se exceptua si coincide EXACTO
      // con packageName + advisoryId de ACCEPTED_EXCEPTIONS.
      if (isKnown && severity === 'high' && isAcceptedAdvisory(packageName, id)) {
        return;
      }
      if (isKnown) {
        counts[severity as KnownSeverity] += 1;
      } else {
        counts.high += 1; // fail-closed: severidad desconocida bloquea como high
      }
    });
  });
  return counts;
}

export function evaluateAuditPass(counts: Pick<SeverityCounts, 'critical' | 'high'>): boolean {
  return counts.critical === 0 && counts.high === 0; // T2
}

/* v8 ignore start */
if (import.meta.main) {
  const result = spawnSync('bun', ['audit', '--json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  try {
    // bun audit sale con exit ≠ 0 ante cualquier vulnerabilidad; el umbral lo decide T2 aquí
    const report: unknown = JSON.parse(result.stdout.trim() === '' ? '{}' : result.stdout);
    const counts = countBySeverity(report);
    console.log(
      `[AuditGate] critical=${counts.critical} · high=${counts.high} · moderate=${counts.moderate} · low=${counts.low} · info=${counts.info}`
    );
    if (!evaluateAuditPass(counts)) {
      console.error(
        `${RED}[FAIL]${RESET} AuditPass ≡ ⊥ — vulnerabilidades critical/high presentes.`
      );
      console.error(result.stdout);
      process.exit(1);
    }
    if (ACCEPTED_EXCEPTIONS.length > 0) {
      ACCEPTED_EXCEPTIONS.forEach((exception) => {
        console.log(
          `[AuditGate] excepcion activa: ${exception.packageName} advisory ${exception.advisoryId} -- revisar antes de ${exception.reviewBy}`
        );
      });
    }
    console.log(`${GREEN}[OK]${RESET} AuditPass ≡ ⊤ (critical = 0 ∧ high = 0).`);
  } catch (error) {
    console.error(`${RED}[FAIL]${RESET} Reporte de auditoría no parseable — fail-closed.`, error);
    console.error(result.stderr);
    process.exit(1);
  }
}
/* v8 ignore stop */
