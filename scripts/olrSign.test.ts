/**
 * FC 068 F1 — olrSign.ts: broker de firma OLR.
 * Scenarios 3 y 4 del FC (escritura correcta · firmante no autorizado rechazado).
 * Firmantes actualizados L V.6.15.0 / KAE-L 2026-07-12 (Holy Trinity).
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

APROBACIONES OLR (Holy Trinity · L V.6.15.0):
- [ ] O [Operational]           — Alfa | Charlie : [Fecha]
- [ ] L [Law / Legal & Privacy] — GrayMan (Ω) solo : [Fecha]
- [ ] R [Review / Regulatory]   — Bravo : [Fecha]

FIRMA DE GRAYMAN: [ ] Aprobado  [ ] Rechazado  [ ] Revisión
\`\`\`
`;

describe('OLR_SIGNERS — mapeo fijo (§19.2 · L V.6.15.0)', () => {
  it('O=Alfa|Charlie · L=GrayMan exclusivo · R=Bravo', () => {
    expect(OLR_SIGNERS.O).toEqual(['Alfa', 'Charlie']);
    expect(OLR_SIGNERS.L).toEqual(['GrayMan']);
    expect(OLR_SIGNERS.R).toEqual(['Bravo']);
  });
});

describe('isAuthorizedSigner — Scenario 4: anti-escalación', () => {
  it('Alfa y Charlie autorizados para O', () => {
    expect(isAuthorizedSigner('O', 'Alfa')).toBe(true);
    expect(isAuthorizedSigner('O', 'Charlie')).toBe(true);
    expect(isAuthorizedSigner('O', 'Bravo')).toBe(false);
  });
  it('GrayMan autorizado para L; ninguna IA lo está', () => {
    expect(isAuthorizedSigner('L', 'GrayMan')).toBe(true);
    expect(isAuthorizedSigner('L', 'Charlie')).toBe(false);
    expect(isAuthorizedSigner('L', 'Alfa')).toBe(false);
    expect(isAuthorizedSigner('L', 'Bravo')).toBe(false);
  });
  it('Bravo autorizado para R — Alfa/Charlie/GrayMan no', () => {
    expect(isAuthorizedSigner('R', 'Bravo')).toBe(true);
    expect(isAuthorizedSigner('R', 'Alfa')).toBe(false);
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
      '- [x] O [Operational]           — Alfa | Charlie : 2026-07-08 18:00:00'
    );
    expect(result.content).toContain(
      '- [ ] L [Law / Legal & Privacy] — GrayMan (Ω) solo : [Fecha]'
    );
    expect(result.content).toContain('- [ ] R [Review / Regulatory]   — Bravo : [Fecha]');
  });

  it('marca [x] + timestamp en la línea del filtro L únicamente', () => {
    const result = applyOlrSignature(FC_FIXTURE, 'L', '2026-07-08 18:05:00');
    expect(result.found).toBe(true);
    expect(result.content).toContain(
      '- [x] L [Law / Legal & Privacy] — GrayMan (Ω) solo : 2026-07-08 18:05:00'
    );
    expect(result.content).toContain('- [ ] O [Operational]           — Alfa | Charlie : [Fecha]');
  });

  it('marca [x] + timestamp en la línea del filtro R únicamente', () => {
    const result = applyOlrSignature(FC_FIXTURE, 'R', '2026-07-08 18:10:00');
    expect(result.found).toBe(true);
    expect(result.content).toContain(
      '- [x] R [Review / Regulatory]   — Bravo : 2026-07-08 18:10:00'
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
  });
});

describe('findFcFile', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'olr-fc-'));
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });
  it('encuentra por prefijo numérico', () => {
    fs.writeFileSync(path.join(tmp, '068_FC_InternalOlrSignoffWorkflow.md'), 'x');
    expect(findFcFile(tmp, '68')).toContain('068_FC_');
  });
});
