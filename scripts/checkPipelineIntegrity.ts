/* eslint-disable no-console */
/**
 * FC 072 F2 — A08_Pipeline_Integrity (OWASP A08:2021 Software & Data Integrity).
 *
 * T2 (conjunción pura): A08 = PASSED ⟺ TodasLasActionsConSha ∧
 * TodosLosInstallsFrozen ∧ SshStrictPinned.
 *
 * - ∀ `uses:` en .github/workflows/*.yml → referencia inmutable @SHA-40
 *   obligatoria (un tag o rama es móvil: quien controle el repo de la action
 *   puede cambiar el código que ejecuta NUESTRO pipeline — clase de ataque
 *   tj-actions 2025). El comentario `# vX.Y.Z` conserva legibilidad.
 * - ∀ `bun install` → `--frozen-lockfile` (instalación determinista contra
 *   bun.lock — integridad de dependencias).
 * - Todo rsync de deploy conserva `StrictHostKeyChecking=yes` (anti-MITM).
 *
 * Dominio: el CLI lista el directorio real .github/workflows/ (condición 2
 * Bravo — jamás una lista fija desincronizable).
 *
 * CLI: `bun scripts/checkPipelineIntegrity.ts` — exit 0 = integridad ⊤.
 * Consumido por CI (deploy.yml, categoría A08) y pre-flight manual.
 * Funciones puras exportadas para tests (Regla 19 · R-BDD-GHERKIN).
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const RED = '[31m';
const GREEN = '[32m';
const RESET = '[0m';

// (?:^|[\s-]) evita falsos positivos de subcadena como "statuses: write"
const USES_PATTERN = /(?:^|[\s-])uses:\s*([^\s#]+)/gm;
const SHA_REF = /@[0-9a-f]{40}$/;

export function checkPipelineIntegrity(workflows: Record<string, string>): string[] {
  const errors: string[] = [];

  Object.entries(workflows).forEach(([file, content]) => {
    // A — toda action con SHA inmutable de 40 hex
    Array.from(content.matchAll(USES_PATTERN)).forEach((match) => {
      const ref = match[1];
      if (ref.startsWith('./')) return; // actions locales del propio repo: sin pin remoto
      if (!SHA_REF.test(ref)) {
        errors.push(`A08 [${file}]: "${ref}" no está pinneada por SHA-40 — referencia mutable.`);
      }
    });

    // B — instalación determinista
    content.split('\n').forEach((line, index) => {
      if (/\bbun install\b/.test(line) && !line.includes('--frozen-lockfile')) {
        errors.push(
          `A08 [${file}:${
            index + 1
          }]: "bun install" sin --frozen-lockfile — instalación no determinista.`
        );
      }
    });

    // C — SSH estricto donde haya rsync de despliegue
    if (/\brsync\b/.test(content) && !content.includes('StrictHostKeyChecking=yes')) {
      errors.push(`A08 [${file}]: rsync presente sin StrictHostKeyChecking=yes — riesgo MITM.`);
    }
  });

  return errors;
}

export default checkPipelineIntegrity;

/* v8 ignore start */
if (import.meta.main) {
  const dir = join(import.meta.dir, '../.github/workflows');
  const workflows: Record<string, string> = {};
  readdirSync(dir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .forEach((f) => {
      workflows[f] = readFileSync(join(dir, f), 'utf8');
    });
  const errors = checkPipelineIntegrity(workflows);
  if (errors.length > 0) {
    console.error(
      `${RED}[FAIL]${RESET} A08 Pipeline Integrity — referencias mutables o instalaciones no deterministas:`
    );
    errors.forEach((e) => console.error(`  ${e}`));
    process.exit(1);
  }
  console.log(
    `${GREEN}[OK]${RESET} A08 Pipeline Integrity — ${
      Object.keys(workflows).length
    } workflow(s): actions con SHA-40, installs deterministas, SSH estricto.`
  );
}
/* v8 ignore stop */
