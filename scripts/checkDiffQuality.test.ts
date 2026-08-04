/**
 * FC 094 F1 — Tests del Gate 2 (Cond.DG1 · Regla 19 R-BDD-GHERKIN).
 * Cubre 2 bugs reales encontrados probando contra commits/archivos reales
 * (no solo fixtures a mano): hunk header de archivo NUEVO (`-0,0 +1,N`) y
 * mismatch de separador de ruta (`git diff` usa `/`, ESLint#filePath usa `\`
 * en Windows) que hacían que el gate pasara en falso (0 hallazgos) sobre un
 * diff con violaciones reales.
 */
import { describe, expect, it } from 'vitest';

import {
  buildOverrideConfig,
  filterFindingsByDiff,
  parseUnifiedDiff,
  type QualityFinding,
} from './checkDiffQuality';

describe('parseUnifiedDiff — extracción de líneas añadidas (git diff -U0)', () => {
  it('extrae las líneas añadidas de un archivo modificado', () => {
    const diff = [
      'diff --git a/a.ts b/a.ts',
      'index 111..222 100644',
      '--- a/a.ts',
      '+++ b/a.ts',
      '@@ -10,0 +11,2 @@',
      '+line 11',
      '+line 12',
    ].join('\n');
    expect(parseUnifiedDiff(diff)).toEqual({ 'a.ts': [11, 12] });
  });

  it('extrae correctamente el hunk de un archivo NUEVO (-0,0 +1,N)', () => {
    // Bug real: un archivo nuevo genera "@@ -0,0 +1,306 @@" — verificado
    // contra scripts/checkDeadExports.ts real que sí producía este header.
    const diff = [
      'diff --git a/b.ts b/b.ts',
      'new file mode 100644',
      'index 000..111',
      '--- /dev/null',
      '+++ b/b.ts',
      '@@ -0,0 +1,3 @@',
      '+export function f() {',
      '+  return 1;',
      '+}',
    ].join('\n');
    expect(parseUnifiedDiff(diff)).toEqual({ 'b.ts': [1, 2, 3] });
  });

  it('un archivo con solo líneas removidas queda con array vacío', () => {
    const diff = [
      'diff --git a/c.ts b/c.ts',
      '--- a/c.ts',
      '+++ b/c.ts',
      '@@ -5,2 +4,0 @@',
      '-removed one',
      '-removed two',
    ].join('\n');
    expect(parseUnifiedDiff(diff)).toEqual({ 'c.ts': [] });
  });

  it('maneja múltiples archivos en un solo diff', () => {
    const diff = [
      'diff --git a/a.ts b/a.ts',
      '+++ b/a.ts',
      '@@ -1,0 +2,1 @@',
      '+x',
      'diff --git a/b.ts b/b.ts',
      '+++ b/b.ts',
      '@@ -1,0 +5,1 @@',
      '+y',
    ].join('\n');
    expect(parseUnifiedDiff(diff)).toEqual({ 'a.ts': [2], 'b.ts': [5] });
  });
});

describe('filterFindingsByDiff — Cond.14: solo bloquea lo tocado en el diff', () => {
  const finding = (file: string, line: number, endLine: number): QualityFinding => ({
    file,
    ruleId: 'max-lines-per-function',
    message: 'x',
    line,
    endLine,
  });

  it('mantiene un hallazgo cuyo rango se solapa con una línea añadida', () => {
    const result = filterFindingsByDiff([finding('a.ts', 10, 60)], { 'a.ts': [15] });
    expect(result).toHaveLength(1);
  });

  it('descarta un hallazgo en código legado intacto (sin solape)', () => {
    const result = filterFindingsByDiff([finding('a.ts', 10, 60)], { 'a.ts': [500] });
    expect(result).toEqual([]);
  });

  it('descarta un hallazgo de un archivo que no aparece en el diff', () => {
    const result = filterFindingsByDiff([finding('other.ts', 10, 60)], { 'a.ts': [15] });
    expect(result).toEqual([]);
  });

  it('mantiene un hallazgo cuando el solape es justo en el borde del rango', () => {
    const result = filterFindingsByDiff([finding('a.ts', 10, 20)], { 'a.ts': [20] });
    expect(result).toHaveLength(1);
  });
});

describe('buildOverrideConfig — 15 nuevo / 20 legado (Cond.4/Cond.R-F1-seal(c))', () => {
  it('usa complexity 15 para archivos no-legado', () => {
    const config = buildOverrideConfig(false);
    expect(config.rules?.['sonarjs/cognitive-complexity']).toEqual(['error', 15]);
  });

  it('usa complexity 20 para archivos en LEGACY_GODFILES', () => {
    const config = buildOverrideConfig(true);
    expect(config.rules?.['sonarjs/cognitive-complexity']).toEqual(['error', 20]);
  });

  it('max-lines-per-function es 50 flat en ambos casos (sin variante legado)', () => {
    const normal = buildOverrideConfig(false);
    const legacy = buildOverrideConfig(true);
    expect((normal.rules?.['max-lines-per-function'] as [string, { max: number }])[1].max).toBe(50);
    expect((legacy.rules?.['max-lines-per-function'] as [string, { max: number }])[1].max).toBe(50);
  });
});
