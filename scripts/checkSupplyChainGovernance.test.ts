import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkAuditCron,
  checkBunVersionSource,
  checkDependabot,
  checkLockFloors,
  checkLockFormat,
  checkMajorIgnore,
  checkPackageManager,
  checkPinnedActions,
  checkPreCommitGuard,
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

describe('FC221 F2 · paridad de Bun y Dependabot sin mayores', () => {
  it.each([
    ['{"packageManager":"bun@1.4.4"}', []],
    ['{"packageManager":"bun@1.5.0"}', []],
    [
      '{"packageManager":"bun@1.3.14"}',
      ['package.json: packageManager declara bun@1.3.14, por debajo del piso 1.4.4'],
    ],
    ['{}', ['package.json: falta «"packageManager": "bun@x.y.z"»']],
  ])('checkPackageManager(%s)', (json, expected) => {
    expect(checkPackageManager(json)).toEqual(expected);
  });

  it('el lock en formato 3 pasa; en otro formato es un hallazgo', () => {
    expect(checkLockFormat('{\n  "lockfileVersion": 3,\n')).toEqual([]);
    expect(checkLockFormat('{\n  "lockfileVersion": 1,\n')).toEqual([
      'bun.lock: falta «"lockfileVersion": 3»',
    ]);
  });

  it('setup-bun con bun-version-file pasa; Bun fijo o sin fuente es un hallazgo', () => {
    const ok = `      - uses: oven-sh/setup-bun@${SHA}\n        with:\n          bun-version-file: 'package.json'`;
    const pinned = `      - uses: oven-sh/setup-bun@${SHA}\n        with:\n          bun-version: 1.3.14`;
    expect(checkBunVersionSource({ 'ok.yml': ok, 'sin-bun.yml': 'jobs:' })).toEqual([]);
    expect(checkBunVersionSource({ 'bad.yml': pinned })).toEqual([
      'bad.yml:3 fija Bun a mano: bun-version: 1.3.14',
      "bad.yml: setup-bun sin «bun-version-file: 'package.json'»",
    ]);
  });

  it('el pre-commit sin la guardia de Bun es un hallazgo', () => {
    expect(checkPreCommitGuard('bun scripts/checkBunVersion.ts\nbun run protocol:verify')).toEqual(
      []
    );
    expect(checkPreCommitGuard('bun run protocol:verify')).toEqual([
      '.husky/pre-commit: falta «bun scripts/checkBunVersion.ts»',
    ]);
  });

  it('ignore por update-types pasa; sin ignore o con versions es un hallazgo', () => {
    const ignore =
      "ignore:\n  - dependency-name: '*'\n    update-types:\n      - version-update:semver-major";
    expect(checkMajorIgnore(ignore)).toEqual([]);
    expect(checkMajorIgnore('groups:')).toEqual([
      'dependabot.yml: falta «ignore:»',
      'dependabot.yml: falta «version-update:semver-major»',
    ]);
    expect(checkMajorIgnore(`${ignore}\n    versions: ['>=5']`)).toEqual([
      'dependabot.yml: «versions:» en ignore también silenciaría parches de seguridad',
    ]);
  });
});

describe('el repositorio completo', () => {
  it('cumple la gobernanza de FC220 y FC221', () => {
    expect(checkRepository(ROOT)).toEqual([]);
  });
});
