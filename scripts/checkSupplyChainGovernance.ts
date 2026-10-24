/* eslint-disable no-console */
/**
 * FC220 F2 (T1b + T2) — gobernanza de la cadena de suministro, verificada sobre los archivos del
 * repositorio (no sobre lo que se pidió, sino sobre lo que quedó):
 *   T1b · pisos de seguridad en las versiones RESUELTAS de `bun.lock` (zod ≥ 4.6.7, undici ≥ 7.30.1);
 *   T2  · Dependabot con ecosistema `bun` y grupos; auditoría diaria con horario, disparo manual,
 *         permiso `issues: write` acotado y paso del Issue `security` bajo `if: failure()`; y toda
 *         directiva `uses:` fijada por SHA de 40 caracteres.
 * Funciones puras exportadas para pruebas. CLI: `bun scripts/checkSupplyChainGovernance.ts`
 * (exit 0 = conforme · exit 1 = hallazgos). Corre en el CI junto a los demás gates.
 * Procedimiento: docs/security/dependency-triage.md
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Pisos de seguridad vigentes (FC220 F1: GHSA-mrhx-c7xc-m3w5 y GHSA-xjj6-f33q-929c). */
export const SECURITY_FLOORS: Readonly<Record<string, string>> = {
  zod: '4.6.7',
  undici: '7.30.1',
};

/** Compara dos versiones `x.y.z` (ignora sufijos de prerelease): negativo, cero o positivo. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string): number[] => v.split('-')[0].split('.').map(Number);
  const [pa, pb] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Todas las versiones de `name` resueltas en `bun.lock`, incluidas las copias anidadas. */
export function resolvedVersions(lock: string, name: string): string[] {
  const escaped = name.replaceAll(/[.*+?^${}()|[\]\\/]/g, String.raw`\$&`);
  const pattern = new RegExp(String.raw`\["${escaped}@(\d[^"]*)"`, 'g');
  return [...lock.matchAll(pattern)].map((match) => match[1]);
}

/** T1b — cada copia resuelta de cada paquete con piso debe alcanzarlo. */
export function checkLockFloors(lock: string, floors = SECURITY_FLOORS): string[] {
  return Object.entries(floors).flatMap(([name, floor]) => {
    const versions = resolvedVersions(lock, name);
    if (versions.length === 0) return [`bun.lock no resuelve ${name}`];
    return versions
      .filter((version) => compareVersions(version, floor) < 0)
      .map((version) => `${name}@${version} en bun.lock está por debajo del piso ${floor}`);
  });
}

/** Comprueba que `text` contenga cada fragmento requerido; devuelve los que faltan. */
function missing(text: string, label: string, required: readonly string[]): string[] {
  return required
    .filter((needle) => !text.includes(needle))
    .map((needle) => `${label}: falta «${needle}»`);
}

/** T2 (B) — Dependabot con el ecosistema de Bun y los dos grupos acordados. */
export function checkDependabot(text: string): string[] {
  return missing(text, 'dependabot.yml', [
    'version: 2',
    'package-ecosystem: bun',
    'dev-dependencies:',
    'production-patches:',
  ]);
}

/** T2 (M) — auditoría diaria: horario, disparo manual, gate, permiso acotado e Issue en el fallo. */
export function checkAuditCron(text: string): string[] {
  return missing(text, 'dependency-audit-cron.yml', [
    "cron: '0 6 * * *'",
    'workflow_dispatch:',
    'bun scripts/dependencyAuditGate.ts',
    'issues: write',
    'if: failure()',
    '--label security',
  ]);
}

const PINNED_USES = /uses:\s*[\w.-]+\/[\w./-]+@[0-9a-f]{40}(\s|$)/;

/** T2 (S) — cada `uses:` de cada workflow fijado por un SHA completo de 40 caracteres. */
export function checkPinnedActions(workflows: Readonly<Record<string, string>>): string[] {
  return Object.entries(workflows).flatMap(([file, text]) =>
    text
      .split('\n')
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter(({ line }) => line.startsWith('uses:') || line.startsWith('- uses:'))
      .filter(({ line }) => !PINNED_USES.test(line.replace(/^-\s*/, '')))
      .map(({ line, number }) => `${file}:${number} no está fijado por SHA: ${line}`)
  );
}

/** Lee el repositorio y corre todas las comprobaciones. */
export function checkRepository(root: string): string[] {
  const read = (path: string): string => readFileSync(join(root, path), 'utf8');
  const workflowDir = join(root, '.github', 'workflows');
  const workflows = Object.fromEntries(
    readdirSync(workflowDir)
      .filter((file) => file.endsWith('.yml'))
      .map((file) => [file, readFileSync(join(workflowDir, file), 'utf8')])
  );
  return [
    ...checkLockFloors(read('bun.lock')),
    ...checkDependabot(read('.github/dependabot.yml')),
    ...checkAuditCron(read('.github/workflows/dependency-audit-cron.yml')),
    ...checkPinnedActions(workflows),
  ];
}

if (import.meta.main) {
  const findings = checkRepository(process.cwd());
  if (findings.length > 0) {
    console.error(`[FAIL] Gobernanza de cadena de suministro — ${findings.length} hallazgo(s):`);
    findings.forEach((finding) => console.error(`  ${finding}`));
    process.exitCode = 1;
  } else {
    console.log(
      '[OK] Gobernanza de cadena de suministro — pisos del lock, Dependabot, auditoría diaria y SHA fijados.'
    );
  }
}
