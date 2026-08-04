/**
 * FC 094 F0/F1 — Tests del gate DC4 (Regla 19 · R-BDD-GHERKIN).
 * Scenario 1 del FC: export nuevo sin consumidor → hallazgo; export usado en
 * otro archivo, o internamente por su propio módulo, o ya listado → no bloquea.
 */
import { describe, expect, it } from 'vitest';

import {
  ALLOWLIST,
  IGNORED_DIRS,
  extractValueExports,
  findDeadExports,
  filterNewFindings,
  isIgnored,
} from './checkDeadExports';

describe('extractValueExports — extracción de exports de valor', () => {
  it('extrae function/const/class/let/var exportados', () => {
    const names = extractValueExports(
      [
        'export function foo() {}',
        'export const bar = 1;',
        'export class Baz {}',
        'export async function qux() {}',
      ].join('\n')
    );
    expect(names).toEqual(['foo', 'bar', 'Baz', 'qux']);
  });

  it('ignora interface/type/enum (uso inferido, no textual)', () => {
    const names = extractValueExports(
      ['export interface Foo {}', 'export type Bar = string;', 'export enum Baz {}'].join('\n')
    );
    expect(names).toEqual([]);
  });

  it('ignora nombres de menos de 3 caracteres (ruido)', () => {
    const names = extractValueExports('export const a = 1;\nexport const abc = 2;');
    expect(names).toEqual(['abc']);
  });
});

describe('findDeadExports — detección dominio finito', () => {
  it('marca un export sin ningún consumidor fuera de su propio archivo', () => {
    const findings = findDeadExports({
      'a.ts': 'export function orphanFn() { return 1; }',
      'b.ts': 'const local = 1;\nconsole.log(local);',
    });
    expect(findings).toEqual([{ file: 'a.ts', name: 'orphanFn' }]);
  });

  it('marca cada export huérfano por separado cuando hay varios', () => {
    const findings = findDeadExports({
      'a.ts': 'export function orphanFn() { return 1; }',
      'b.ts': 'export const unrelated = 1;',
    });
    expect(findings).toEqual([
      { file: 'a.ts', name: 'orphanFn' },
      { file: 'b.ts', name: 'unrelated' },
    ]);
  });

  it('no marca un export usado en otro archivo de producto', () => {
    const findings = findDeadExports({
      'a.ts': 'export function usedFn() { return 1; }',
      'b.ts': "import { usedFn } from './a';\nusedFn();",
    });
    expect(findings).toEqual([]);
  });

  it('no marca un helper exportado pero usado dentro de su propio archivo (patrón F3c1)', () => {
    const findings = findDeadExports({
      'route.ts': [
        'export function computeSeverity(x: number) { return x > 5 ? "high" : "low"; }',
        'export async function handler() { return computeSeverity(10); }',
        'fastify.get("/alerts", handler);',
      ].join('\n'),
    });
    expect(findings).toEqual([]);
  });

  it('ignora archivos entrypoint (index.ts/main.tsx)', () => {
    const findings = findDeadExports({
      'apps/api/src/index.ts': 'export function registerAll() {}',
    });
    expect(findings).toEqual([]);
  });
});

describe('isIgnored / filterNewFindings — ALLOWLIST e IGNORED_DIRS', () => {
  it('filtra hallazgos dentro de un directorio de IGNORED_DIRS', () => {
    expect(IGNORED_DIRS.length).toBeGreaterThan(0);
    const dir = IGNORED_DIRS[0];
    expect(isIgnored({ file: `${dir}/seedXData.ts`, name: 'ANYTHING' })).toBe(true);
  });

  it('filtra hallazgos listados explícitamente en ALLOWLIST', () => {
    expect(ALLOWLIST.length).toBeGreaterThan(0);
    const entry = ALLOWLIST[0];
    expect(isIgnored({ file: entry.file, name: entry.symbol })).toBe(true);
  });

  it('NO filtra un hallazgo nuevo, no listado', () => {
    expect(isIgnored({ file: 'apps/api/src/routes/nope.ts', name: 'brandNewOrphan' })).toBe(false);
  });

  it('filterNewFindings solo deja pasar lo no listado', () => {
    const entry = ALLOWLIST[0];
    const result = filterNewFindings([
      { file: entry.file, name: entry.symbol },
      { file: 'apps/api/src/routes/nope.ts', name: 'brandNewOrphan' },
    ]);
    expect(result).toEqual([{ file: 'apps/api/src/routes/nope.ts', name: 'brandNewOrphan' }]);
  });

  it('cada entrada de ALLOWLIST tiene una razón documentada no vacía', () => {
    ALLOWLIST.forEach((entry) => {
      expect(entry.reason.length).toBeGreaterThan(10);
    });
  });
});
