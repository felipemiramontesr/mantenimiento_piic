import { describe, it, expect } from 'vitest';
import { checkSecureDesignGates, type SecureDesignInput } from './checkSecureDesignGates';

/**
 * FC 072 F1 — A04_Secure_Design_Evidence.
 * T1: A04 = PASSED ⟺ HookActivo ∧ GatesCableados ∧ JobsBloqueantes.
 * Fixtures de sabotaje OBLIGATORIOS (condición 1 Bravo): cada control
 * descablado debe producir su error específico — fail-closed.
 */

const HEALTHY: SecureDesignInput = {
  preCommitHook: '#!/usr/bin/env sh\nbun run protocol:verify\nbunx lint-staged\n',
  packageJson: '{ "scripts": { "protocol:verify": "bun scripts/verifyProtocolL.ts" } }',
  verifierSource: [
    'const a1Errors = checkFcA1Declaration(fcContent);',
    'const errors = checkOlrApproval(fcContent);',
    'const conduct = checkRaptorConduct(masterContent);',
    'const all = runConsistencyChecks(input);',
  ].join('\n'),
  deployWorkflow: [
    'run: bun scripts/checkNoRawSql.ts',
    'run: bun scripts/dependencyAuditGate.ts',
    'needs:',
    '  [',
    '    backend-validation,',
    '    frontend-validation,',
    '    database-validation,',
    '    security-scan,',
    '    e2e-validation,',
    '    sonar-scan,',
    '  ]',
  ].join('\n'),
};

describe('checkSecureDesignGates (FC 072 F1 — T1)', () => {
  it('T1 ⊤⊤⊤: healthy terrain returns no errors', () => {
    expect(checkSecureDesignGates(HEALTHY)).toEqual([]);
  });

  // ── Sabotaje A: hook pre-commit descablado ──────────────────────────────────
  it('fails when the pre-commit hook does not invoke protocol:verify', () => {
    const errors = checkSecureDesignGates({
      ...HEALTHY,
      preCommitHook: '#!/usr/bin/env sh\nbunx lint-staged\n',
    });
    expect(errors.some((e) => e.includes('pre-commit'))).toBe(true);
  });

  it('fails when package.json lost the protocol:verify script', () => {
    const errors = checkSecureDesignGates({
      ...HEALTHY,
      packageJson: '{ "scripts": { "dev": "vite" } }',
    });
    expect(errors.some((e) => e.includes('protocol:verify'))).toBe(true);
  });

  // ── Sabotaje B: gates descablados del verificador (Scenario 2) ─────────────
  it.each(['checkFcA1Declaration', 'checkOlrApproval', 'checkRaptorConduct'])(
    'fails when %s is no longer CALLED by the verifier',
    (gate) => {
      const sabotaged = HEALTHY.verifierSource
        .split('\n')
        .filter((line) => !line.includes(gate))
        .join('\n');
      const errors = checkSecureDesignGates({ ...HEALTHY, verifierSource: sabotaged });
      expect(errors.some((e) => e.includes(gate))).toBe(true);
    }
  );

  it('an import alone does not count as wiring — the gate must be invoked', () => {
    const importOnly = {
      ...HEALTHY,
      verifierSource: [
        "import { checkFcA1Declaration, checkOlrApproval, checkRaptorConduct } from './protocolLConsistency';",
      ].join('\n'),
    };
    const errors = checkSecureDesignGates(importOnly);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  // ── Sabotaje C: jobs de seguridad fuera del pipeline ────────────────────────
  it('fails when checkNoRawSql disappears from the workflow', () => {
    const errors = checkSecureDesignGates({
      ...HEALTHY,
      deployWorkflow: HEALTHY.deployWorkflow.replace('run: bun scripts/checkNoRawSql.ts', ''),
    });
    expect(errors.some((e) => e.includes('checkNoRawSql'))).toBe(true);
  });

  it('fails when e2e-validation or sonar-scan leave the certification needs', () => {
    const errors = checkSecureDesignGates({
      ...HEALTHY,
      deployWorkflow: HEALTHY.deployWorkflow
        .replace('    e2e-validation,\n', '')
        .replace('    sonar-scan,\n', ''),
    });
    expect(errors.some((e) => e.includes('e2e-validation'))).toBe(true);
    expect(errors.some((e) => e.includes('sonar-scan'))).toBe(true);
  });
});
