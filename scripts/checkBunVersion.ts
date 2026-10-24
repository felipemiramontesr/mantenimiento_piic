/* eslint-disable no-console */
/**
 * FC221 F1 (T1, B) — guardia de paridad del entorno local: la versión de Bun de la máquina debe ser
 * la que declara `packageManager` en el package.json raíz (fuente única que también leen los
 * workflows con `bun-version-file`). Con otra versión, `bun.lock` puede quedar en un formato que el
 * CI o Dependabot no leen. Corre en `.husky/pre-commit` y bloquea el commit si no coinciden.
 * CLI: `bun scripts/checkBunVersion.ts` — exit 0 = coincide · exit 1 = difiere o no hay declaración.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Versión declarada en `packageManager` (`bun@x.y.z`), o null si falta o no es de Bun. */
export function declaredBunVersion(packageJson: string): string | null {
  const field = (JSON.parse(packageJson) as { packageManager?: unknown }).packageManager;
  if (typeof field !== 'string') return null;
  const match = /^bun@(\d+\.\d+\.\d+)$/.exec(field);
  return match ? match[1] : null;
}

/** Motivo del rechazo, o null si la máquina corre la versión declarada. */
export function bunVersionMismatch(declared: string | null, running: string): string | null {
  if (declared === null) return 'package.json no declara "packageManager": "bun@x.y.z"';
  if (declared === running) return null;
  return `Esta máquina corre Bun ${running} y package.json declara ${declared}. Instala Bun ${declared} (https://bun.sh/docs/installation)`;
}

if (import.meta.main) {
  const declared = declaredBunVersion(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  const running = process.versions.bun ?? 'desconocida (no se ejecuta con Bun)';
  const problem = bunVersionMismatch(declared, running);
  if (problem) {
    console.error(`[FAIL] Paridad de Bun — ${problem}`);
    process.exitCode = 1;
  } else {
    console.log(`[OK] Paridad de Bun — ${running} = packageManager.`);
  }
}
