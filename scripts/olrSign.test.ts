/**
 * FC 068 F1 — olrSign.ts: broker de firma OLR.
 * Scenarios 3 y 4 del FC (escritura correcta · firmante no autorizado rechazado).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { applyOlrSignature, findFcFile, isAuthorizedSigner, OLR_SIGNERS } from './olrSign';

const FC_FIXTURE = `# FC 999 — Fixture_Test

\`\`\`
FEATURE CONTRACT
Feature      : Fixture_Test

Requiere OLR : [x] Sí  [ ] No

APROBACIONES OLR (solo si Requiere OLR = Sí — §19.2/§20.1, firmantes fijos):
- [ ] O [Operational & Safety]  — Charlie     : [Fecha]
- [ ] L [Legal & Privacy]       — GrayMan     : [Fecha]
- [ ] R [Regulatory Audit]      — Alfa/Bravo  : [Fecha]

FIRMA DE GRAYMAN: [ ] Aprobado  [ ] Rechazado  [ ] Revisión
\`\`\`
`;

describe('OLR_SIGNERS — mapeo fijo (§19.2/§20.1)', () => {
  it('O=Charlie exclusivo · L=GrayMan exclusivo · R=Alfa|Bravo', () => {
    expect(OLR_SIGNERS.O).toEqual(['Charlie']);
    expect(OLR_SIGNERS.L).toEqual(['GrayMan']);
    expect(OLR_SIGNERS.R).toEqual(['Alfa', 'Bravo']);
  });
});

describe('isAuthorizedSigner — Scenario 4: anti-escalación', () => {
  it('Charlie autorizado para O', () => {
    expect(isAuthorizedSigner('O', 'Charlie')).toBe(true);
  });
  it('GrayMan autorizado para L; ninguna IA lo está', () => {
    expect(isAuthorizedSigner('L', 'GrayMan')).toBe(true);
    expect(isAuthorizedSigner('L', 'Charlie')).toBe(false);
    expect(isAuthorizedSigner('L', 'Alfa')).toBe(false);
    expect(isAuthorizedSigner('L', 'Bravo')).toBe(false);
  });
  it('Alfa y Bravo autorizados para R (basta 1) — Charlie y GrayMan no', () => {
    expect(isAuthorizedSigner('R', 'Alfa')).toBe(true);
    expect(isAuthorizedSigner('R', 'Bravo')).toBe(true);
    expect(isAuthorizedSigner('R', 'Charlie')).toBe(false);
    expect(isAuthorizedSigner('R', 'GrayMan')).toBe(false);
  });
  it('firmante inexistente rechazado para cualquier filtro', () => {
    expect(isAuthorizedSigner('O', 'Intruso')).toBe(false);
    expect(isAuthorizedSigner('R', 'Intruso')).toBe(false);
  });
});

describe('applyOlrSignature — Scenario 3: escritura correcta, sin tocar otras líneas', () => {
  it('marca [x] + timestamp en la línea del filtro O únicamente', () => {
    const result = applyOlrSignature(FC_FIXTURE, 'O', '2026-07-08 18:00:00');
    expect(result.found).toBe(true);
    expect(result.content).toContain(
      '- [x] O [Operational & Safety]  — Charlie     : 2026-07-08 18:00:00'
    );
    // las otras 2 líneas permanecen intactas
    expect(result.content).toContain('- [ ] L [Legal & Privacy]       — GrayMan     : [Fecha]');
    expect(result.content).toContain('- [ ] R [Regulatory Audit]      — Alfa/Bravo  : [Fecha]');
  });

  it('marca [x] + timestamp en la línea del filtro L únicamente', () => {
    const result = applyOlrSignature(FC_FIXTURE, 'L', '2026-07-08 18:05:00');
    expect(result.found).toBe(true);
    expect(result.content).toContain(
      '- [x] L [Legal & Privacy]       — GrayMan     : 2026-07-08 18:05:00'
    );
    expect(result.content).toContain('- [ ] O [Operational & Safety]  — Charlie     : [Fecha]');
  });

  it('marca [x] + timestamp en la línea del filtro R únicamente', () => {
    const result = applyOlrSignature(FC_FIXTURE, 'R', '2026-07-08 18:10:00');
    expect(result.found).toBe(true);
    expect(result.content).toContain(
      '- [x] R [Regulatory Audit]      — Alfa/Bravo  : 2026-07-08 18:10:00'
    );
  });

  it('firmar las 3 categorías en secuencia deja las 3 marcadas', () => {
    let content = FC_FIXTURE;
    content = applyOlrSignature(content, 'O', '2026-07-08 18:00:00').content;
    content = applyOlrSignature(content, 'L', '2026-07-08 18:05:00').content;
    content = applyOlrSignature(content, 'R', '2026-07-08 18:10:00').content;
    expect(content).toContain('[x] O');
    expect(content).toContain('[x] L');
    expect(content).toContain('[x] R');
  });

  it('found=false cuando el FC no tiene el bloque de aprobaciones OLR', () => {
    const result = applyOlrSignature('# FC sin checklist OLR', 'O', '2026-07-08 18:00:00');
    expect(result.found).toBe(false);
    expect(result.content).toBe('# FC sin checklist OLR');
  });
});

describe('findFcFile — lookup por número, sin hardcodear rutas', () => {
  let dir: string;

  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('encuentra el archivo cuyo nombre empieza con el número dado (padded a 3 dígitos)', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'olrsign-'));
    fs.writeFileSync(path.join(dir, '068_FC_InternalOlrSignoffWorkflow.md'), FC_FIXTURE, 'utf8');
    fs.writeFileSync(path.join(dir, '067_FC_UniverseOnboardingFoundations.md'), '', 'utf8');

    expect(findFcFile(dir, '68')).toBe(path.join(dir, '068_FC_InternalOlrSignoffWorkflow.md'));
    expect(findFcFile(dir, '068')).toBe(path.join(dir, '068_FC_InternalOlrSignoffWorkflow.md'));
  });

  it('retorna null si no existe ningún FC con ese número', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'olrsign-'));
    expect(findFcFile(dir, '999')).toBeNull();
  });
});
