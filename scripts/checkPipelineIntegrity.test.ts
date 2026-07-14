import { describe, it, expect } from 'vitest';
import { checkPipelineIntegrity } from './checkPipelineIntegrity';

/**
 * FC 072 F2 — A08_Pipeline_Integrity (OWASP A08:2021).
 * T2: A08 = PASSED ⟺ TodasLasActionsConSha ∧ TodosLosInstallsFrozen ∧ SshStrictPinned.
 * El dominio real lo produce el CLI listando .github/workflows/ — aquí se
 * ejercita la función pura con fixtures (incluidos sabotajes, Scenarios 3/4).
 */

const SHA = 'a'.repeat(40);

const HEALTHY: Record<string, string> = {
  'deploy.yml': [
    `      - uses: actions/checkout@${SHA} # v5`,
    '      - name: Install dependencies',
    '        run: bun install --frozen-lockfile',
    '        run: |',
    '          rsync -avz --delete \\',
    '            -e "ssh -p 22 -o StrictHostKeyChecking=yes" ./dist/ user@host:/path/',
  ].join('\n'),
  'db-migrations.yml': [
    `      - uses: oven-sh/setup-bun@${SHA} # v2`,
    '        run: bun install --frozen-lockfile',
  ].join('\n'),
};

describe('checkPipelineIntegrity (FC 072 F2 — T2)', () => {
  it('T2 ⊤⊤⊤: workflows sanos → sin errores', () => {
    expect(checkPipelineIntegrity(HEALTHY)).toEqual([]);
  });

  // ── Scenario 3 — uses con tag mutable ───────────────────────────────────────
  it('fails when a uses points to a mutable tag instead of a 40-hex SHA', () => {
    const errors = checkPipelineIntegrity({
      ...HEALTHY,
      'deploy.yml': HEALTHY['deploy.yml'].replace(
        `actions/checkout@${SHA} # v5`,
        'actions/checkout@v5'
      ),
    });
    expect(errors.some((e) => e.includes('deploy.yml') && e.includes('actions/checkout@v5'))).toBe(
      true
    );
  });

  it('fails on branch pins like @master (el peor caso)', () => {
    const errors = checkPipelineIntegrity({
      ...HEALTHY,
      'deploy.yml': `${HEALTHY['deploy.yml']}\n      - uses: SonarSource/sonarqube-quality-gate-action@master`,
    });
    expect(errors.some((e) => e.includes('@master'))).toBe(true);
  });

  it('a short (non-40) hex ref does not count as a SHA pin', () => {
    const errors = checkPipelineIntegrity({
      'deploy.yml': `      - uses: actions/checkout@${'a'.repeat(7)} # v5`,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  // ── Scenario 4 — install no determinista ────────────────────────────────────
  it('fails when a bun install lacks --frozen-lockfile', () => {
    const errors = checkPipelineIntegrity({
      ...HEALTHY,
      'db-migrations.yml': HEALTHY['db-migrations.yml'].replace(
        'bun install --frozen-lockfile',
        'bun install'
      ),
    });
    expect(
      errors.some((e) => e.includes('db-migrations.yml') && e.includes('--frozen-lockfile'))
    ).toBe(true);
  });

  // ── SSH estricto en el deploy ────────────────────────────────────────────────
  it('fails when rsync loses StrictHostKeyChecking=yes', () => {
    const errors = checkPipelineIntegrity({
      ...HEALTHY,
      'deploy.yml': HEALTHY['deploy.yml'].replace(
        'StrictHostKeyChecking=yes',
        'StrictHostKeyChecking=no'
      ),
    });
    expect(errors.some((e) => e.includes('StrictHostKeyChecking'))).toBe(true);
  });

  it('does not false-positive on permission lines like statuses: write', () => {
    expect(
      checkPipelineIntegrity({
        'deploy.yml': 'permissions:\n  checks: write\n  statuses: write\n',
      })
    ).toEqual([]);
  });

  it('workflows without rsync are not required to declare SSH strictness', () => {
    expect(
      checkPipelineIntegrity({ 'finance-periodic.yml': `      - uses: x/y@${SHA} # v1` })
    ).toEqual([]);
  });
});
