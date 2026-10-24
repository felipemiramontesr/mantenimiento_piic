import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkAuditCron,
  checkDependabot,
  checkLockFloors,
  checkPinnedActions,
  checkRepository,
  compareVersions,
  resolvedVersions,
} from './checkSupplyChainGovernance';

/**
 * FC220 F2 (T1b + T2) — gobernanza de la cadena de suministro: pisos de las versiones resueltas en
 * bun.lock, Dependabot, auditoría diaria con Issue `security` y acciones fijadas por SHA.
 */

const ROOT = join(import.meta.dirname, '..');
const SHA = 'a'.repeat(40);

describe('compareVersions', () => {
  it.each([
    ['4.6.7', '4.6.7', 0],
    ['4.6.8', '4.6.7', 1],
    ['3.25.76', '4.6.7', -1],
    ['7.30.1', '7.30.0', 1],
    ['4.6.7-beta.1', '4.6.7', 0],
    ['4.7', '4.6.9', 1],
  ])('compareVersions(%s, %s) tiene el signo de %s', (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b))).toBe(sign);
  });
});

describe('T1b · pisos del lock', () => {
  const lock = [
    '"zod": ["zod@4.6.7", "", {}, "sha512-x"],',
    '"eslint-plugin-react-hooks/zod": ["zod@3.25.76", "", {}, "sha512-y"],',
    '"undici": ["undici@7.30.1", "", {}, "sha512-z"],',
  ].join('\n');

  it('lee todas las copias resueltas, incluidas las anidadas', () => {
    expect(resolvedVersions(lock, 'zod')).toEqual(['4.6.7', '3.25.76']);
  });

  it('una copia anidada por debajo del piso es un hallazgo', () => {
    expect(checkLockFloors(lock)).toEqual([
      'zod@3.25.76 en bun.lock está por debajo del piso 4.6.7',
    ]);
  });

  it('un paquete con piso que el lock no resuelve es un hallazgo', () => {
    expect(checkLockFloors('', { zod: '4.6.7' })).toEqual(['bun.lock no resuelve zod']);
  });

  it('el bun.lock real cumple los pisos', () => {
    expect(checkLockFloors(readFileSync(join(ROOT, 'bun.lock'), 'utf8'))).toEqual([]);
  });
});

describe('T2 · Dependabot y auditoría diaria', () => {
  it('Dependabot sin el ecosistema bun ni los grupos es un hallazgo', () => {
    expect(checkDependabot('version: 2\npackage-ecosystem: npm')).toEqual([
      'dependabot.yml: falta «package-ecosystem: bun»',
      'dependabot.yml: falta «dev-dependencies:»',
      'dependabot.yml: falta «production-patches:»',
    ]);
  });

  it('una auditoría diaria sin Issue en el fallo es un hallazgo', () => {
    const cron =
      "cron: '0 6 * * *'\nworkflow_dispatch:\nbun scripts/dependencyAuditGate.ts\nissues: write";
    expect(checkAuditCron(cron)).toEqual([
      'dependency-audit-cron.yml: falta «if: failure()»',
      'dependency-audit-cron.yml: falta «--label security»',
    ]);
  });
});

describe('T2 · acciones fijadas por SHA', () => {
  it('acepta un SHA de 40 caracteres, con o sin comentario de versión', () => {
    const workflow = [
      `      - uses: actions/checkout@${SHA} # v5`,
      `        uses: oven-sh/setup-bun@${SHA}`,
    ].join('\n');
    expect(checkPinnedActions({ 'ok.yml': workflow })).toEqual([]);
  });

  it('una etiqueta mutable o un SHA corto son hallazgos con su línea', () => {
    const workflow = [
      'steps:',
      '  - uses: actions/checkout@v5',
      `  - uses: actions/cache@${'b'.repeat(12)}`,
    ].join('\n');
    expect(checkPinnedActions({ 'bad.yml': workflow })).toEqual([
      'bad.yml:2 no está fijado por SHA: - uses: actions/checkout@v5',
      `bad.yml:3 no está fijado por SHA: - uses: actions/cache@${'b'.repeat(12)}`,
    ]);
  });
});

describe('el repositorio completo', () => {
  it('cumple la gobernanza de FC220', () => {
    expect(checkRepository(ROOT)).toEqual([]);
  });
});
