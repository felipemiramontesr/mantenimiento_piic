/**
 * FC 053 F7 — Tests del verificador de consistencia de L (Regla 19 · R-BDD-GHERKIN).
 * Cada bloque mapea un Scenario Gherkin del FC 053_FC_ProtocolLDeterministicClosure.
 */
import * as fs from 'fs';
import * as path from 'path';

import { describe, expect, it } from 'vitest';

import {
  checkClaudeMdCoherence,
  computeLHash,
  shouldReRead,
  checkConsecutiveAuthors,
  checkVersionSync,
  checkCursorTable,
  checkExclusionSetRegistry,
  checkFcActivo,
  checkHOrder,
  checkMinCursorGC,
  checkRuleRegistry,
  checkVersionFormat,
  runConsistencyChecks,
} from './protocolLConsistency';

const ROOT = path.join(__dirname, '..');

function buildMasterFixture(options?: {
  rules?: string;
  registry?: string;
  title?: string;
}): string {
  const title = options?.title ?? 'VEINTIDÓS';
  const registry = options?.registry ?? `| 1 | \`R-AUTONOMY\` | 2 | \`R-TESTS-SAME-COMMIT\` |`;
  const rules =
    options?.rules ??
    `1.  **[\`R-AUTONOMY\`] Autonomía total:** texto.
2.  **[\`R-TESTS-SAME-COMMIT\`] Tests en el mismo commit:** texto.`;
  return `
| **Versión del Protocolo** | \`V.6.11.15\` |

## VERSIÓN ACTIVA DEL PROYECTO
\`\`\`
VERSIÓN ACTUAL: V.78.101.465_FC053_Deterministic_Closure
\`\`\`

## FEATURE CONTRACT ACTIVO
\`\`\`
FC 053 Protocol_L_Deterministic_Closure
Estado: EN EJECUCIÓN
\`\`\`

## ÍNDICE GENERAL

## SECCIÓN 5: MODELO DE OPERACIÓN AUTÓNOMA (LAS ${title} REGLAS)

### 5.0 Registro de Identificadores Inmutables de Reglas
| # | ID | # | ID |
|---|----|---|----|
${registry}

### 5.1 Las Reglas
${rules}

### 5.2 Checklist Pre-Commit
Requieren confirmación explícita: \`git push -f\`, \`git reset --hard\`, \`rm -rf\` y \`git clean -f\`.
`;
}

// Fixture de título ajustado: DOS reglas en fixture → usamos conteo que coincide vía tabla
const MASTER_TWO_RULES = buildMasterFixture({ title: 'VEINTIDÓS' });

describe('Scenario 8 — Auto-verificación: regla duplicada detectada (Gherkin FC 053)', () => {
  it('falla con exit ≠ 0 (errores > 0) cuando §5.1 duplica un número de regla', () => {
    const master = buildMasterFixture({
      rules: `1.  **[\`R-AUTONOMY\`] Autonomía total:** texto.
1.  **[\`R-TESTS-SAME-COMMIT\`] Tests en el mismo commit:** texto.`,
    });
    const errors = checkRuleRegistry(master);
    expect(errors.some((e) => e.includes('números de regla duplicados'))).toBe(true);
  });

  it('falla cuando un ID R-* aparece duplicado', () => {
    const master = buildMasterFixture({
      rules: `1.  **[\`R-AUTONOMY\`] Autonomía total:** texto.
2.  **[\`R-AUTONOMY\`] Otra regla con ID robado:** texto.`,
    });
    const errors = checkRuleRegistry(master);
    expect(errors.some((e) => e.includes('IDs de regla duplicados'))).toBe(true);
  });

  it('falla cuando el título declara un conteo distinto al real', () => {
    const errors = checkRuleRegistry(MASTER_TWO_RULES);
    expect(errors.some((e) => e.includes('el título declara 22 reglas pero §5.1 contiene 2'))).toBe(
      true
    );
  });
});

describe('Scenario 6 — Referencia estable por ID inmutable (Gherkin FC 053)', () => {
  it('detecta divergencia registro §5.0 ↔ reglas inline §5.1', () => {
    const master = buildMasterFixture({
      registry: `| 1 | \`R-AUTONOMY\` | 2 | \`R-RENAMED-DRIFT\` |`,
    });
    const errors = checkRuleRegistry(master);
    expect(errors.some((e) => e.includes('R-TESTS-SAME-COMMIT') && e.includes('no aparece'))).toBe(
      true
    );
  });

  it('detecta ordinal desalineado entre registro y regla inline', () => {
    const master = buildMasterFixture({
      registry: `| 1 | \`R-AUTONOMY\` | 5 | \`R-TESTS-SAME-COMMIT\` |`,
    });
    const errors = checkRuleRegistry(master);
    expect(errors.some((e) => e.includes('mapea al ordinal 5'))).toBe(true);
  });
});

describe('Scenario 7 — Fuente única: CLAUDE.md no enuncia conteo propio (Gherkin FC 053)', () => {
  const master = MASTER_TWO_RULES;

  it('rechaza CLAUDE.md con re-enunciación de reglas', () => {
    const claude = `## REGLAS DE OPERACIÓN AUTÓNOMA (VIGENTES — 20 REGLAS)\n001_NS_ProtocoloL.md`;
    const errors = checkClaudeMdCoherence(claude, master);
    expect(errors.some((e) => e.includes('re-enunciación prohibida'))).toBe(true);
  });

  it('rechaza CLAUDE.md cuyo conteo citado deriva del de L (20 vs 22)', () => {
    const claude = `## FUENTE ÚNICA DE VERDAD\n001_NS_ProtocoloL.md\n§5 (Las Veinte Reglas)\ngit push -f · git reset --hard · rm -rf · git clean -f`;
    const errors = checkClaudeMdCoherence(claude, master);
    expect(errors.some((e) => e.includes('deriva de conteo'))).toBe(true);
  });

  it('acepta CLAUDE.md puntero con conteo correcto y citas §5.3 completas', () => {
    const claude = `## FUENTE ÚNICA DE VERDAD\n001_NS_ProtocoloL.md\n§5 (Las Veintidós Reglas)\ngit push -f · git reset --hard · rm -rf · git clean -f`;
    const errors = checkClaudeMdCoherence(claude, master);
    expect(errors).toEqual([]);
  });
});

describe('Scenario 3 — Orden temporal verificable con desempate por seq (Gherkin FC 053)', () => {
  it('acepta timestamps iguales en orden de archivo (empate resuelto por seq — fila ⊥⊤⊤ de T2)', () => {
    const h = `## CANAL DE MENSAJES X\n### A → B · 2026-07-03 10:00:00\nmsg\n### B → A · 2026-07-03 10:00:00\nmsg`;
    expect(checkHOrder(h)).toEqual([]);
  });

  it('rechaza timestamp que retrocede (fila ⊥⊥R de T2) — nunca indecidible', () => {
    const h = `## CANAL DE MENSAJES X\n### A → B · 2026-07-03 10:00:00\nmsg\n### B → A · 2026-07-03 09:59:59\nmsg`;
    const errors = checkHOrder(h);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('ValidOrder');
  });
});

describe('Scenario 4/5 — PreFlight y ExclusionSet auditable (Gherkin FC 053)', () => {
  it('exige registro ExclusionSet presente en 052', () => {
    const errors = checkExclusionSetRegistry('# 052 sin registro');
    expect(errors[0]).toContain('REGISTRO CANÓNICO ExclusionSet');
  });

  it('rechaza entradas de ExclusionSet sin causa técnica', () => {
    const doc = `REGISTRO CANÓNICO ExclusionSet\n| Archivo | Líneas | Causa técnica | Registrado |\n|---|---|---|---|\n| \`a.ts\` | 10 |  | 2026-07-03 |\n\n## Siguiente`;
    const errors = checkExclusionSetRegistry(doc);
    expect(errors.some((e) => e.includes('sin líneas o sin causa técnica'))).toBe(true);
  });
});

describe('Checks estructurales — FC ACTIVO y formato de versión', () => {
  it('valida FC ACTIVO bien formado y versión con formato V.x.y.z_Descriptor', () => {
    expect(checkFcActivo(MASTER_TWO_RULES)).toEqual([]);
    expect(checkVersionFormat(MASTER_TWO_RULES)).toEqual([]);
  });

  it('rechaza L sin bloque FC ACTIVO', () => {
    const errors = checkFcActivo('# L vacío\n## ÍNDICE');
    expect(errors[0]).toContain('FEATURE CONTRACT ACTIVO');
  });
});

function buildHandoffFixture(options?: {
  cursores?: string;
  estado?: string;
  msgs?: string;
}): string {
  const cursores =
    options?.cursores ??
    'Cursores        : Alfa=2026-07-03 10:00:00 · Bravo=2026-07-03 10:00:00 · Charlie=2026-07-03 11:00:00';
  const estado = options?.estado ?? 'ESTADO\n  FC activo : 054 — test\n  Próximo   : cierre';
  const msgs =
    options?.msgs ?? `### A → B · 2026-07-03 10:00:00\nmsg\n\n### B → A · 2026-07-03 11:00:00\nmsg`;
  return `# HANDOFF\n\`\`\`\nÚltimo mensaje  : x\n${cursores}\n${estado}\n═══\n\`\`\`\n\n## CANAL DE MENSAJES X\n\n${msgs}\n`;
}

describe('FC 054 Scenario 5 — Cursor inválido detectado (Gherkin)', () => {
  it('acepta cabecera con tabla Cursores válida y ESTADO ≤ 6 líneas (T2 fila ⊤⊤)', () => {
    expect(checkCursorTable(buildHandoffFixture())).toEqual([]);
  });

  it('rechaza cursor posterior al último mensaje del canal (T2 fila ⊤⊥ — cursor en el futuro)', () => {
    const h = buildHandoffFixture({
      cursores:
        'Cursores        : Alfa=2026-07-03 10:00:00 · Bravo=2026-07-03 10:00:00 · Charlie=2026-07-03 23:59:59',
    });
    const errors = checkCursorTable(h);
    expect(errors.some((e) => e.includes('cursor(Charlie)') && e.includes('más allá'))).toBe(true);
  });

  it('rechaza tabla Cursores ausente o con formato corrupto (T2 fila ⊥Q)', () => {
    const h = buildHandoffFixture({
      cursores: 'Cursores : Alfa=ayer · Bravo=hoy · Charlie=mañana',
    });
    const errors = checkCursorTable(h);
    expect(errors.some((e) => e.includes('falta la tabla'))).toBe(true);
  });

  it('rechaza bloque ESTADO ausente y bloque ESTADO > 6 líneas', () => {
    const sinEstado = buildHandoffFixture({ estado: 'SIN-BLOQUE' });
    expect(checkCursorTable(sinEstado).some((e) => e.includes('falta el bloque "ESTADO"'))).toBe(
      true
    );

    const inflado = buildHandoffFixture({ estado: `ESTADO\n1\n2\n3\n4\n5\n6\n7` });
    expect(checkCursorTable(inflado).some((e) => e.includes('máximo 6'))).toBe(true);
  });
});

describe('FC 054 Scenario 6 + 3/4 — GC por mínimo (Gherkin)', () => {
  it('detecta recolección pendiente: mensaje por debajo de min(cursores) que no es el último (T1 ⊤⊤⊤)', () => {
    const h = buildHandoffFixture({
      cursores:
        'Cursores        : Alfa=2026-07-03 10:30:00 · Bravo=2026-07-03 10:30:00 · Charlie=2026-07-03 11:00:00',
    });
    const errors = checkMinCursorGC(h);
    expect(errors.some((e) => e.includes('recolección pendiente') && e.includes('#1'))).toBe(true);
  });

  it('protege lo no leído: mensaje ≥ min(cursores) permanece aunque otros cursores estén adelante (T1 con ⊥)', () => {
    expect(checkMinCursorGC(buildHandoffFixture())).toEqual([]);
  });

  it('conserva el último mensaje como ancla aunque esté por debajo del mínimo', () => {
    const h = buildHandoffFixture({
      cursores:
        'Cursores        : Alfa=2026-07-03 23:00:00 · Bravo=2026-07-03 23:00:00 · Charlie=2026-07-03 23:00:00',
      msgs: `### A → B · 2026-07-03 11:00:00\nmsg`,
    });
    expect(checkMinCursorGC(h)).toEqual([]);
  });
});

describe('FC 056 Scenarios 2/3/4 — Enforcement de R-H-COMPACT (T1: ViolatesCompact ≡ P ∧ ¬Q)', () => {
  const canal = (msgs: string): string => `## CANAL DE MENSAJES X\n\n${msgs}\n`;

  it('T1 fila ⊤⊥ — cola intra-sesión del mismo autor sin ACK: VIOLACIÓN (Scenario 2)', () => {
    const h = canal(
      `### Charlie → Alfa · 2026-07-03 10:00:00\n\n[FASE 1] avance\n\n---\n\n### Charlie → Alfa · 2026-07-03 10:05:00\n\n[FASE 2] avance`
    );
    const errors = checkConsecutiveAuthors(h);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('cola de autor consecutivo');
  });

  it('T1 fila ⊤⊤ — cola propia con [ACK L] de nueva sesión: legal (Scenario 3, coherente con AppendAllowed)', () => {
    const h = canal(
      `### Charlie → Alfa · 2026-07-03 10:00:00\n\n[FC CERRADO] fin de sesión\n\n---\n\n### Charlie → Alfa · 2026-07-03 12:00:00\n\n[ACK L] Charlie al día · nueva sesión`
    );
    expect(checkConsecutiveAuthors(h)).toEqual([]);
  });

  it('T1 filas ⊥Q — autores alternados: legal (Scenario 4)', () => {
    const h = canal(
      `### Charlie → Alfa · 2026-07-03 10:00:00\n\nmsg\n\n---\n\n### Alfa → Charlie · 2026-07-03 10:05:00\n\nmsg\n\n---\n\n### Bravo → Charlie · 2026-07-03 10:10:00\n\nmsg`
    );
    expect(checkConsecutiveAuthors(h)).toEqual([]);
  });

  it('cola de 3+ mensajes reporta cada par consecutivo violatorio', () => {
    const h = canal(
      `### Charlie → Alfa · 2026-07-03 10:00:00\n\na\n\n---\n\n### Charlie → Alfa · 2026-07-03 10:05:00\n\nb\n\n---\n\n### Charlie → Alfa · 2026-07-03 10:10:00\n\nc`
    );
    expect(checkConsecutiveAuthors(h).length).toBe(2);
  });
});

describe('FC 057 — Sincronía de versiones L ↔ H (T1: VersionSync ≡ A ∧ B)', () => {
  const master = `VERSIÓN ACTUAL: V.78.101.468_FC056_H_Compact_Enforcement`;
  const handoff = (headerVer: string, estadoVer: string): string =>
    `Versión activa  : ${headerVer}_Desc\nESTADO\n  Versión   : ${estadoVer} · commits`;

  it('T1 fila ⊤⊤ — sincronía total: cero errores', () => {
    expect(checkVersionSync(master, handoff('V.78.101.468', 'V.78.101.468'))).toEqual([]);
  });

  it('T1 fila ⊥⊤ — header desincronizado (caso empírico 467 vs 468)', () => {
    const errors = checkVersionSync(master, handoff('V.78.101.467', 'V.78.101.468'));
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('la cabecera de H declara V.78.101.467');
  });

  it('T1 fila ⊤⊥ — ESTADO desincronizado', () => {
    const errors = checkVersionSync(master, handoff('V.78.101.468', 'V.78.101.467'));
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('ESTADO de H declara V.78.101.467');
  });

  it('falla si falta la línea "Versión activa" en la cabecera', () => {
    const errors = checkVersionSync(master, 'ESTADO\n  Versión   : V.78.101.468');
    expect(errors.some((e) => e.includes('falta la línea "Versión activa"'))).toBe(true);
  });
});

describe('FC 063 F2 — Cláusula L por hash (T1: ReRead ≡ HashChanged ∨ NewSession)', () => {
  it('T1 filas ⊤⊤/⊤⊥/⊥⊤ → relectura obligatoria · fila ⊥⊥ → contexto vigente', () => {
    expect(shouldReRead(true, true)).toBe(true);
    expect(shouldReRead(true, false)).toBe(true);
    expect(shouldReRead(false, true)).toBe(true);
    expect(shouldReRead(false, false)).toBe(false);
  });

  it('computeLHash es determinista y sensible a contenido, orden y fronteras de archivo', () => {
    expect(computeLHash(['core', 'anexo'])).toBe(computeLHash(['core', 'anexo']));
    expect(computeLHash(['core', 'anexo'])).not.toBe(computeLHash(['core', 'anexo2']));
    expect(computeLHash(['core', 'anexo'])).not.toBe(computeLHash(['anexo', 'core']));
    expect(computeLHash(['ab', 'c'])).not.toBe(computeLHash(['a', 'bc']));
    expect(computeLHash(['core'])).toMatch(/^[0-9a-f]{12}$/);
  });

  it('el hash del L-CORE real + anexos reales es calculable (Scenario 2 FC 063 — Gherkin)', () => {
    const core = fs.readFileSync(
      path.join(ROOT, 'Protocolos/North_Star/001_NS_ProtocoloL.md'),
      'utf8'
    );
    const anexos = fs.readFileSync(
      path.join(ROOT, 'Protocolos/North_Star/053_NS_LAnexosLibros.md'),
      'utf8'
    );
    expect(computeLHash([core, anexos])).toMatch(/^[0-9a-f]{12}$/);
    expect(computeLHash([core])).not.toBe(computeLHash([core, anexos]));
  });
});

describe('Integración — los documentos reales de gobernanza son consistentes (Scenarios 1/2 anclados)', () => {
  const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

  it('runConsistencyChecks retorna cero errores sobre los archivos reales del repo', () => {
    const errors = runConsistencyChecks({
      masterContent: read('Protocolos/North_Star/001_NS_ProtocoloL.md'),
      claudeContent: read('CLAUDE.md'),
      handoffContent: read('Protocolos/North_Star/002_NS_Handoff.md'),
      invariantsContent: read('Protocolos/North_Star/052_NS_MetaLInvariants.md'),
    });
    expect(errors).toEqual([]);
  });

  it('L real contiene la excepción formal de nueva sesión AppendAllowed (Scenarios 1 y 2)', () => {
    const master = read('Protocolos/North_Star/001_NS_ProtocoloL.md');
    expect(master).toContain(
      'AppendAllowed(H, r, s) ≡ ConsecutiveCount(H, r, s) = 0 ∨ NewSession(s)'
    );
    expect(master).toContain('ValidOrder(mᵢ, mⱼ)');
    expect(master).toContain('PreFlight(φ) ≡ (⋀ᵢ₌₁⁸ Gate_i(φ)) ∧ H-Valid(H)');
  });
});
