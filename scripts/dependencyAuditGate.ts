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

export function countBySeverity(report: unknown): SeverityCounts {
  if (report === null || typeof report !== 'object' || Array.isArray(report)) {
    throw new TypeError('Reporte de auditoría malformado: se esperaba objeto paquete→advisories');
  }
  const counts: SeverityCounts = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };
  Object.values(report as Record<string, unknown>).forEach((advisories) => {
    if (!Array.isArray(advisories)) {
      throw new TypeError('Reporte de auditoría malformado: advisories no es una lista');
    }
    advisories.forEach((advisory) => {
      const { severity } = advisory as { severity?: unknown };
      if (KNOWN_SEVERITIES.includes(severity as KnownSeverity)) {
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
    console.log(`${GREEN}[OK]${RESET} AuditPass ≡ ⊤ (critical = 0 ∧ high = 0).`);
  } catch (error) {
    console.error(`${RED}[FAIL]${RESET} Reporte de auditoría no parseable — fail-closed.`, error);
    console.error(result.stderr);
    process.exit(1);
  }
}
/* v8 ignore stop */
