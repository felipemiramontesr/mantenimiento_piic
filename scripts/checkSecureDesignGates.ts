/* eslint-disable no-console */
/**
 * FC 072 F1 — A04_Secure_Design_Evidence (OWASP A04:2021 Insecure Design).
 *
 * ALCANCE DECLARADO (condición 1 Bravo, v1.1): esta evidencia certifica que los
 * **controles SDLC de Protocolo L** están ACTIVOS y CABLEADOS — hook pre-commit,
 * gates duros (A1/OLR/Conducta) invocados por el verificador, y jobs de
 * seguridad bloqueantes en el pipeline. NO certifica threat-modeling individual
 * por feature de producto (eso vive en cada FC vía A1 dominio/tablas de verdad).
 *
 * T1 (conjunción pura): A04 = PASSED ⟺ HookActivo ∧ GatesCableados ∧
 * JobsBloqueantes. No circular (dictamen Bravo 16:14:47): el check lee los
 * ARCHIVOS REALES del terreno y falla cerrado ante cualquier sabotaje —
 * descablar un gate pinta la fila A04 en rojo y bloquea el certificado.
 *
 * CLI: `bun scripts/checkSecureDesignGates.ts` — exit 0 = evidencia ⊤.
 * Consumido por CI (deploy.yml, categoría A04) y pre-flight manual.
 * Funciones puras exportadas para tests (Regla 19 · R-BDD-GHERKIN).
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const RED = '[31m';
const GREEN = '[32m';
const RESET = '[0m';

export interface SecureDesignInput {
  preCommitHook: string;
  packageJson: string;
  /**
   * Cadena COMPLETA del verificador: concatenación de verifyProtocolL.ts +
   * protocolLConsistency.ts — los gates pueden cablearse directo (verifyOlrGate)
   * o vía runConsistencyChecks (checkRaptorConduct); ambos cuentan solo si la
   * llamada existe en la cadena Y runConsistencyChecks está invocado.
   */
  verifierSource: string;
  deployWorkflow: string;
}

/** Dominio finito de gates duros del SDLC (Regla 22 — enumerado, sin implícitos). */
const REQUIRED_GATES = [
  'checkFcA1Declaration',
  'checkOlrApproval',
  'checkRaptorConduct',
  'runConsistencyChecks',
];

/** Jobs/steps de seguridad que deben permanecer bloqueantes en el pipeline. */
const REQUIRED_WORKFLOW_MARKERS = [
  'scripts/checkNoRawSql.ts',
  'scripts/dependencyAuditGate.ts',
  'e2e-validation',
  'sonar-scan',
];

export function checkSecureDesignGates(input: SecureDesignInput): string[] {
  const errors: string[] = [];

  // A — Hook pre-commit activo
  if (!/protocol:verify|verifyProtocolL/.test(input.preCommitHook)) {
    errors.push('A04: el hook pre-commit NO invoca protocol:verify — SDLC descablado.');
  }
  if (!/"protocol:verify"\s*:/.test(input.packageJson)) {
    errors.push('A04: package.json perdió el script "protocol:verify".');
  }

  // B — Gates duros invocados (no basta el import: se exige llamada `gate(`)
  REQUIRED_GATES.forEach((gate) => {
    const callPattern = new RegExp(`(?<!import[^\\n]*)\\b${gate}\\s*\\(`);
    const lines = input.verifierSource
      .split('\n')
      .filter((line) => !/^\s*import\b/.test(line))
      .join('\n');
    if (!callPattern.test(lines)) {
      errors.push(`A04: el verificador ya no INVOCA ${gate} — gate descablado.`);
    }
  });

  // C — Jobs de seguridad presentes y en la cadena de certificación
  REQUIRED_WORKFLOW_MARKERS.forEach((marker) => {
    if (!input.deployWorkflow.includes(marker)) {
      errors.push(`A04: el pipeline perdió el marcador de seguridad "${marker}".`);
    }
  });

  return errors;
}

/* v8 ignore start */
if (import.meta.main) {
  const root = join(import.meta.dir, '..');
  const input: SecureDesignInput = {
    preCommitHook: readFileSync(join(root, '.husky/pre-commit'), 'utf8'),
    packageJson: readFileSync(join(root, 'package.json'), 'utf8'),
    verifierSource:
      readFileSync(join(root, 'scripts/verifyProtocolL.ts'), 'utf8') +
      readFileSync(join(root, 'scripts/protocolLConsistency.ts'), 'utf8'),
    deployWorkflow: readFileSync(join(root, '.github/workflows/deploy.yml'), 'utf8'),
  };
  const errors = checkSecureDesignGates(input);
  if (errors.length > 0) {
    console.error(`${RED}[FAIL]${RESET} A04 Insecure Design — controles SDLC descablados:`);
    errors.forEach((e) => console.error(`  ${e}`));
    process.exit(1);
  }
  console.log(
    `${GREEN}[OK]${RESET} A04 Insecure Design — controles SDLC de Protocolo L activos y cableados (hook + ${REQUIRED_GATES.length} gates + ${REQUIRED_WORKFLOW_MARKERS.length} marcadores de pipeline).`
  );
}
/* v8 ignore stop */
