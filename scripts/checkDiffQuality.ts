/* eslint-disable no-console, no-underscore-dangle */
/**
 * FC 094 F1 — Gate 2: Dual-Gate diff-scoped quality (maxFnLoc/complexity/jsdoc).
 *
 * Resolución 111_AN (Alfa) + auditoría Bravo (H 2026-08-03 21:54:11): T1 del FC
 * anota `ExcedeFnLoc/Complexity(diff)` — esa dimensión SIEMPRE se pensó
 * evaluable sobre el diff, a diferencia de `max-lines` (tamaño de archivo,
 * Gate 1, allowlist estática). El veto de 105_AN a "script git-diff" era
 * específico contra reemplazar la allowlist de ARCHIVO, no contra un gate
 * diff-scoped para esta dimensión distinta.
 *
 * Qué hace: calcula qué líneas fueron AÑADIDAS en el diff (staged localmente,
 * o entre dos refs en CI), corre ESLint (API, reusando eslint.config.mjs +
 * overrides propios de max-lines-per-function/cognitive-complexity/
 * jsdoc-require-jsdoc) sobre los archivos tocados, y sólo reporta violaciones
 * cuyo rango de línea se solapa con líneas añadidas — código legado intacto
 * nunca bloquea (Cond.14, cero fricción retroactiva). `complexity` usa el
 * umbral relajado (20) para archivos en LEGACY_GODFILES (Cond.4/Cond.R-F1-seal
 * (c)), 15 en cualquier otro archivo tocado. `max-lines-per-function` es 50
 * flat (Fase 1 scope, sin variante legado). jsdoc/require-jsdoc con
 * `publicOnly` cubre Cond.8 (TSDoc en exports públicos nuevos).
 *
 * CLI: `bun scripts/checkDiffQuality.ts` — diff de STAGED (uso local,
 * pre-commit) · `bun scripts/checkDiffQuality.ts --base <ref> [--head <ref>]`
 * — diff entre dos refs (uso en CI). Exit 0 = sin hallazgos nuevos en el diff
 * · exit 1 = hallazgo(s). Funciones puras exportadas para tests (Regla 19 ·
 * R-BDD-GHERKIN).
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint, type Linter } from 'eslint';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import sonarjsPlugin from 'eslint-plugin-sonarjs';

import { LEGACY_GODFILES } from '../eslint.config.mjs';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

// `import.meta.dir` es exclusivo de Bun — rompe bajo vitest/Node al importar
// este módulo desde el test file (Bug real encontrado corriendo los tests).
// `fileURLToPath` + `dirname` es portable Node/Bun, mismo patrón que
// eslint.config.mjs.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = join(__dirname, '..');
const TARGET_RULES = new Set([
  'max-lines-per-function',
  'sonarjs/cognitive-complexity',
  'jsdoc/require-jsdoc',
]);

export type DiffMap = Record<string, number[]>;

const FILE_HEADER = /^\+\+\+ b\/(.+)$/;
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/** Parsea `git diff -U0` — sin líneas de contexto, cada `+` es una línea
 * genuinamente añadida en el archivo nuevo. */
export function parseUnifiedDiff(diffText: string): DiffMap {
  const map: DiffMap = {};
  let currentFile: string | null = null;
  let newLineNo = 0;

  diffText.split(/\r?\n/).forEach((line) => {
    const fileMatch = FILE_HEADER.exec(line);
    if (fileMatch) {
      [, currentFile] = fileMatch;
      if (!map[currentFile]) map[currentFile] = [];
      return;
    }
    const hunkMatch = HUNK_HEADER.exec(line);
    if (hunkMatch) {
      newLineNo = Number(hunkMatch[1]);
      return;
    }
    if (currentFile === null) return;
    if (line.startsWith('+') && !line.startsWith('+++')) {
      map[currentFile].push(newLineNo);
      newLineNo += 1;
    }
    // líneas '-' (removidas) no avanzan newLineNo; con -U0 no hay contexto.
  });

  return map;
}

function isProductFile(file: string): boolean {
  if (!/\.(ts|tsx)$/.test(file)) return false;
  return !/\.(test|spec)\.(ts|tsx)$/.test(file) && !file.startsWith('e2e/');
}

export interface QualityFinding {
  file: string;
  ruleId: string;
  message: string;
  line: number;
  endLine: number;
}

function overlapsAddedLines(addedLines: number[], line: number, endLine: number): boolean {
  return addedLines.some((l) => l >= line && l <= endLine);
}

/** Cond.14: código legado intacto nunca bloquea — solo lo que el diff tocó. */
export function filterFindingsByDiff(
  findings: QualityFinding[],
  diffMap: DiffMap
): QualityFinding[] {
  return findings.filter((f) => {
    const added = diffMap[f.file];
    if (!added || added.length === 0) return false;
    return overlapsAddedLines(added, f.line, f.endLine ?? f.line);
  });
}

/** Config ESLint de Gate 2: maxFnLoc 50 flat + complexity 15(nuevo)/20(`isLegacy`) + jsdoc/require-jsdoc en exports públicos. */
export function buildOverrideConfig(isLegacy: boolean): Linter.Config {
  return {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { sonarjs: sonarjsPlugin, jsdoc: jsdocPlugin },
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 50, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      'sonarjs/cognitive-complexity': ['error', isLegacy ? 20 : 15],
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            ClassDeclaration: true,
            MethodDefinition: false,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
        },
      ],
    },
  };
}

/* v8 ignore start */
/** `execFileSync` (no shell) a propósito: `execSync` en Windows corre vía
 * `cmd.exe`, que no interpreta comillas simples — el pathspec `'*.ts'
 * '*.tsx'` llegaba literal a git (comillas incluidas) y no matcheaba nada,
 * produciendo un diff vacío en silencio (bug real encontrado al probar contra
 * commits reales, no solo tests unitarios). Un array de argumentos evita el
 * shell por completo, portable entre Windows/POSIX.
 */
function getDiffText(baseRef?: string, headRef?: string): string {
  const args = baseRef
    ? ['diff', '-U0', baseRef, headRef ?? 'HEAD', '--diff-filter=ACMR', '--', '*.ts', '*.tsx']
    : ['diff', '--cached', '-U0', '--diff-filter=ACMR', '--', '*.ts', '*.tsx'];
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function normalizePath(p: string): string {
  return p.replaceAll('\\', '/');
}

/** `git diff` siempre normaliza rutas a `/`; `ESLint#lintFiles`'s `filePath`
 * es absoluto y nativo del SO (`\` en Windows) — sin normalizar, la
 * intersección contra `diffMap` (claves de `git diff`) falla en silencio
 * (bug real encontrado probando contra un archivo de prueba real, no solo
 * en tests unitarios con paths ya normalizados a mano). */
const ROOT_NORMALIZED = normalizePath(ROOT);

/** Un solo `ESLint` por lote (legacy vs no-legacy) — construirlo por archivo
 * re-resuelve eslint.config.mjs completo (FlatCompat/airbnb-base) cada vez,
 * ~19s/instancia medido empíricamente; por lote son 1-2 construcciones total
 * sin importar cuántos archivos toque el diff. */
async function lintBatch(files: string[], isLegacy: boolean): Promise<QualityFinding[]> {
  if (files.length === 0) return [];
  const eslint = new ESLint({
    cwd: ROOT,
    overrideConfig: [buildOverrideConfig(isLegacy)],
  });
  const results = await eslint.lintFiles(files);
  return results.flatMap((r) => {
    const normalized = normalizePath(r.filePath);
    const relative = normalized.startsWith(`${ROOT_NORMALIZED}/`)
      ? normalized.slice(ROOT_NORMALIZED.length + 1)
      : normalized;
    return r.messages
      .filter((m) => m.ruleId !== null && TARGET_RULES.has(m.ruleId))
      .map((m) => ({
        file: relative,
        ruleId: m.ruleId as string,
        message: m.message,
        line: m.line,
        endLine: m.endLine ?? m.line,
      }));
  });
}

function parseArgs(argv: string[]): { base?: string; head?: string } {
  const out: { base?: string; head?: string } = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--base') out.base = argv[i + 1];
    if (argv[i] === '--head') out.head = argv[i + 1];
  }
  return out;
}

async function main(): Promise<void> {
  const { base, head } = parseArgs(process.argv.slice(2));
  const diffText = getDiffText(base, head);
  const diffMap = parseUnifiedDiff(diffText);
  const touchedFiles = Object.keys(diffMap).filter(isProductFile);

  if (touchedFiles.length === 0) {
    console.log(`${GREEN}[OK]${RESET} Gate 2 (diff-scoped) -- sin archivos de producto tocados.`);
    return;
  }

  const legacySet = new Set<string>(LEGACY_GODFILES);
  const legacyFiles = touchedFiles.filter((f) => legacySet.has(f));
  const normalFiles = touchedFiles.filter((f) => !legacySet.has(f));
  const allFindings = [
    ...(await lintBatch(legacyFiles, true)),
    ...(await lintBatch(normalFiles, false)),
  ];
  const findings = filterFindingsByDiff(allFindings, diffMap);

  if (findings.length > 0) {
    console.error(
      `${RED}[FAIL]${RESET} Gate 2 (diff-scoped) -- ${findings.length} hallazgo(s) en código tocado:`
    );
    findings.forEach((f) => {
      console.error(`  ${f.file}:${f.line} [${f.ruleId}] ${f.message}`);
    });
    console.error(
      '\nmax-lines-per-function:50 / cognitive-complexity:15(nuevo)-20(legado) / TSDoc en exports ' +
        'públicos nuevos (Cond.8) -- solo aplica a funciones/exports CREADOS o MODIFICADOS en este diff.'
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `${GREEN}[OK]${RESET} Gate 2 (diff-scoped) -- ${touchedFiles.length} archivo(s) tocado(s), 0 hallazgos.`
  );
}

const isDirectRun = /checkDiffQuality\.(ts|js)$/.test(process.argv[1] ?? '');
if (isDirectRun) {
  main().catch((err) => {
    console.error(`${RED}[ERROR]${RESET} Gate 2 crashed:`, err);
    process.exitCode = 2;
  });
}
/* v8 ignore stop */
