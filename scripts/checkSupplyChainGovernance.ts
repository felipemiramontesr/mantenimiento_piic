/* eslint-disable no-console */
/**
 * FC220 F2 (T1b + T2) — gobernanza de la cadena de suministro, verificada sobre los archivos del
 * repositorio (no sobre lo que se pidió, sino sobre lo que quedó):
 *   T1b · pisos de seguridad en las versiones RESUELTAS de `bun.lock` (zod ≥ 4.6.7, undici ≥ 7.30.1);
 *   T2  · Dependabot con ecosistema `bun` y grupos; auditoría diaria con horario, disparo manual,
 *         permiso `issues: write` acotado y paso del Issue `security` bajo `if: failure()`; y toda
 *         directiva `uses:` fijada por SHA de 40 caracteres.
 *   FC221 F2 · `packageManager` con Bun exacto ≥ piso, `bun.lock` en formato 3, workflows con
 *         `bun-version-file` (sin `bun-version:` fijo), guardia `checkBunVersion` en el pre-commit y
 *         Dependabot sin saltos mayores (`ignore` por `update-types`, sin `versions`).
 * Funciones puras exportadas para pruebas. CLI: `bun scripts/checkSupplyChainGovernance.ts`
 * (exit 0 = conforme · exit 1 = hallazgos). Corre en el CI junto a los demás gates.
 * Procedimiento: docs/security/dependency-triage.md
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { declaredBunVersion } from './checkBunVersion';

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

/** Piso de Bun: la primera versión que escribe y lee `bun.lock` en formato 3 (FC221 F1). */
export const BUN_FLOOR = '1.4.4';

/** T2 (P) — `packageManager` declara una versión exacta de Bun que alcanza el piso. */
export function checkPackageManager(packageJson: string, floor = BUN_FLOOR): string[] {
  const declared = declaredBunVersion(packageJson);
  if (declared === null) return ['package.json: falta «"packageManager": "bun@x.y.z"»'];
  if (compareVersions(declared, floor) < 0) {
    return [`package.json: packageManager declara bun@${declared}, por debajo del piso ${floor}`];
  }
  return [];
}

/** T2 (L) — `bun.lock` en el formato 3 que leen Bun 1.4 y Dependabot. */
export function checkLockFormat(lock: string): string[] {
  return lock.includes('"lockfileVersion": 3,') ? [] : ['bun.lock: falta «"lockfileVersion": 3»'];
}

/** T2 (C) — paridad del CI: ningún workflow fija Bun a mano; todos leen `packageManager`. */
export function checkBunVersionSource(workflows: Readonly<Record<string, string>>): string[] {
  return Object.entries(workflows).flatMap(([file, text]) => {
    const lines = text.split('\n').map((line, index) => ({ line: line.trim(), number: index + 1 }));
    const pinned = lines
      .filter(({ line }) => line.startsWith('bun-version:'))
      .map(({ line, number }) => `${file}:${number} fija Bun a mano: ${line}`);
    const usesSetupBun = lines.some(({ line }) => line.includes('oven-sh/setup-bun@'));
    const readsPackageJson = text.includes("bun-version-file: 'package.json'");
    const unsourced =
      usesSetupBun && !readsPackageJson
        ? [`${file}: setup-bun sin «bun-version-file: 'package.json'»`]
        : [];
    return [...pinned, ...unsourced];
  });
}

/** T2 (H) — la guardia local de paridad de Bun corre en el pre-commit. */
export function checkPreCommitGuard(hook: string): string[] {
  return missing(hook, '.husky/pre-commit', ['bun scripts/checkBunVersion.ts']);
}

/** T2 (I) — Dependabot ignora los saltos mayores solo por `update-types`, sin `versions`. */
export function checkMajorIgnore(text: string): string[] {
  const findings = missing(text, 'dependabot.yml', ['ignore:', 'version-update:semver-major']);
  return text.split('\n').some((line) => line.trim().startsWith('versions:'))
    ? [
        ...findings,
        'dependabot.yml: «versions:» en ignore también silenciaría parches de seguridad',
      ]
    : findings;
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
  const lock = read('bun.lock');
  const dependabot = read('.github/dependabot.yml');
  return [
    ...checkLockFloors(lock),
    ...checkLockFormat(lock),
    ...checkDependabot(dependabot),
    ...checkMajorIgnore(dependabot),
    ...checkAuditCron(read('.github/workflows/dependency-audit-cron.yml')),
    ...checkPinnedActions(workflows),
    ...checkBunVersionSource(workflows),
    ...checkPackageManager(read('package.json')),
    ...checkPreCommitGuard(read('.husky/pre-commit')),
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
      '[OK] Gobernanza de cadena de suministro — pisos y formato del lock, Dependabot sin mayores, auditoría diaria, SHA fijados y paridad de Bun.'
    );
  }
}
