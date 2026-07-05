/**
 * FC 061 F1 — Tests del broker hPost (Regla 19 · R-BDD-GHERKIN).
 * Cada bloque mapea la tabla T1 o un Scenario Gherkin de 061_FC_HBrokerPost.md,
 * más las observaciones (a) TTL/p99 y (b) atomicidad wx en OneDrive de la
 * auditoría de Bravo (2026-07-04 14:51).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCK_TTL_MS,
  acquireLock,
  applyGC,
  applyPost,
  decideAction,
  isDuplicatePost,
  isNewSessionAck,
  parseChannel,
  releaseLock,
  runHPost,
  updateCursor,
  updateEstado,
} from './hPost';
import { checkConsecutiveAuthors, checkHOrder, runConsistencyChecks } from './protocolLConsistency';

const ROOT = path.join(__dirname, '..');

// ─── Fixtures de gobernanza mínimos que dejan los 10 checks en ⊤ ────────────

function buildMaster(version = 'V.78.101.470'): string {
  const ids = Array.from({ length: 20 }, (_, i) => `R-TEST-${i + 1}`);
  const registry = ids.map((id, i) => `| ${i + 1} | \`${id}\` |`).join('\n');
  const rules = ids.map((id, i) => `${i + 1}.  **[\`${id}\`] Regla ${i + 1}:** texto.`).join('\n');
  return `
| **Versión del Protocolo** | \`V.6.12.1\` |

## VERSIÓN ACTIVA DEL PROYECTO
\`\`\`
VERSIÓN ACTUAL: ${version}_FC061_Test
\`\`\`

## FEATURE CONTRACT ACTIVO
\`\`\`
FC 061 H_Broker_Post
Estado: EN EJECUCIÓN
\`\`\`

## ÍNDICE GENERAL

## SECCIÓN 5: MODELO DE OPERACIÓN AUTÓNOMA (LAS VEINTE REGLAS)

### 5.0 Registro de Identificadores Inmutables de Reglas
| # | ID |
|---|----|
${registry}

### 5.1 Las Reglas
${rules}

### 5.2 Checklist Pre-Commit
Requieren confirmación explícita: \`git push -f\`, \`git reset --hard\`, \`rm -rf\` y \`git clean -f\`.
`;
}

const CLAUDE_FIXTURE = `## FUENTE ÚNICA DE VERDAD
001_NS_ProtocoloL.md
§5 (Las Veinte Reglas)
git push -f · git reset --hard · rm -rf · git clean -f
`;

const INVARIANTS_FIXTURE = `REGISTRO CANÓNICO ExclusionSet
| Archivo | Líneas | Causa técnica | Registrado |
|---|---|---|---|
| \`a.ts\` | 10 | V8 async artifact | 2026-07-03 |

## Siguiente
`;

function buildHandoff(options?: { cursores?: string; msgs?: string; version?: string }): string {
  const version = options?.version ?? 'V.78.101.470';
  const cursores =
    options?.cursores ??
    'Cursores        : Alfa=2026-07-04 10:00:00 · Bravo=2026-07-04 10:00:00 · Charlie=2026-07-04 10:00:00';
  const msgs =
    options?.msgs ??
    '### Alfa → Bravo/Charlie · 2026-07-04 10:00:00\n\n[BASE] mensaje inicial de fixture\n[Alfa SENTINELA]';
  return `# HANDOFF: GrayMan | Alfa | Bravo | Charlie

\`\`\`
HANDOFF: GrayMan | Alfa | Bravo | Charlie
═══════════════════════════════════════════
Versión activa  : ${version}_FC061_Test
Fecha           : 2026-07-04
Último mensaje  : **Alfa → Bravo/Charlie** · 2026-07-04 10:00:00 [BASE]
${cursores}
───────────────────────────────────────────
ESTADO
  FC activo : FC 061 test
  Versión   : ${version} · test
  Próximo   : test
═══════════════════════════════════════════
\`\`\`

## CANAL DE MENSAJES GrayMan | Alfa | Bravo | Charlie

*(fixture)*

---

${msgs}
`;
}

const at =
  (iso: string): (() => Date) =>
  (): Date =>
    new Date(iso.replace(' ', 'T'));

interface TempEnv {
  dir: string;
  handoffPath: string;
  historicoPath: string;
  masterPath: string;
  claudePath: string;
  invariantsPath: string;
}

const tempDirs: string[] = [];

function writeEnv(handoff: string, master = buildMaster()): TempEnv {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hpost-'));
  tempDirs.push(dir);
  const env: TempEnv = {
    dir,
    handoffPath: path.join(dir, '002_NS_Handoff.md'),
    historicoPath: path.join(dir, 'HISTORICO_HANDOFF.md'),
    masterPath: path.join(dir, '001_NS_ProtocoloL.md'),
    claudePath: path.join(dir, 'CLAUDE.md'),
    invariantsPath: path.join(dir, '052_NS_MetaLInvariants.md'),
  };
  fs.writeFileSync(env.handoffPath, handoff, 'utf8');
  fs.writeFileSync(env.historicoPath, '# HISTORICO HANDOFF (fixture)\n', 'utf8');
  fs.writeFileSync(env.masterPath, master, 'utf8');
  fs.writeFileSync(env.claudePath, CLAUDE_FIXTURE, 'utf8');
  fs.writeFileSync(env.invariantsPath, INVARIANTS_FIXTURE, 'utf8');
  return env;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop() as string;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ─── T1 — Decisión del broker (4 filas) ─────────────────────────────────────

describe('T1 — decisión del broker: P = SameAuthor · Q = NewSessionACK', () => {
  it('fila ⊥⊥ → APPEND (caso normal — otro autor intervino)', () => {
    expect(decideAction(false, false)).toBe('APPEND');
  });

  it('fila ⊥⊤ → APPEND (ACK tras intervención)', () => {
    expect(decideAction(false, true)).toBe('APPEND');
  });

  it('fila ⊤⊤ → APPEND (excepción NewSession de AppendAllowed — I-6 fila A=⊥,B=⊤)', () => {
    expect(decideAction(true, true)).toBe('APPEND');
  });

  it('fila ⊤⊥ → EXTEND (auto-consolidación — I-6 por construcción)', () => {
    expect(decideAction(true, false)).toBe('EXTEND');
  });

  it('NewSessionACK se deriva del cuerpo: [ACK L] / [ACK H] en la primera línea no vacía', () => {
    expect(isNewSessionAck('[ACK H] al día')).toBe(true);
    expect(isNewSessionAck('\n  [ACK L] al día')).toBe(true);
    expect(isNewSessionAck('[FASE 1] avance')).toBe(false);
  });
});

// ─── Scenario 1 — TOCTOU muerto ──────────────────────────────────────────────

describe('Scenario 1 — TOCTOU muerto: el broker relee H real dentro del lock', () => {
  it('A redactó sobre snapshot viejo; B anexó después; el post de A queda DESPUÉS del de B con ts fresco', () => {
    const env = writeEnv(buildHandoff());
    // Charlie "redactó" su post leyendo el fixture original (snapshot viejo).
    const draft = '[HITO] dictamen redactado sobre snapshot viejo';
    // Bravo interviene después de esa lectura:
    const bravo = runHPost({
      author: 'Bravo',
      body: '[NOTA] intervención de Bravo',
      ...env,
      now: at('2026-07-04 10:05:00'),
    });
    expect(bravo.status).toBe('posted');
    // Charlie publica su borrador viejo — el broker relee el H real:
    const charlie = runHPost({
      author: 'Charlie',
      body: draft,
      ...env,
      now: at('2026-07-04 10:10:00'),
    });
    expect(charlie.status).toBe('posted');
    expect(charlie.action).toBe('APPEND');

    const result = fs.readFileSync(env.handoffPath, 'utf8');
    const channel = parseChannel(result);
    const authors = channel.messages.map((m) => m.author);
    expect(authors).toEqual(['Alfa', 'Bravo', 'Charlie']);
    expect(channel.messages[2].timestamp).toBe('2026-07-04 10:10:00');
    expect(checkHOrder(result)).toEqual([]); // ValidOrder imposible de violar
  });
});

// ─── Scenario 2 — Auto-consolidación (T1 fila ⊤⊥) ───────────────────────────

describe('Scenario 2 — auto-consolidación: EXTEND del bloque propio', () => {
  const handoff = buildHandoff({
    msgs: [
      '### Alfa → Bravo/Charlie · 2026-07-04 10:00:00\n\n[BASE] mensaje inicial',
      '### Charlie → Alfa/Bravo · 2026-07-04 10:30:00\n\n[FASE 1] avance previo',
    ].join('\n\n---\n\n'),
    cursores:
      'Cursores        : Alfa=2026-07-04 10:00:00 · Bravo=2026-07-04 10:00:00 · Charlie=2026-07-04 10:30:00',
  });

  it('el último mensaje es del autor sin ACK → EXTIENDE el bloque con timestamp actualizado, cero colas I-6', () => {
    const posted = applyPost(handoff, {
      author: 'Charlie',
      body: '[FASE 2] nuevo hito',
      timestamp: '2026-07-04 11:00:00',
    });
    expect(posted.action).toBe('EXTEND');
    const channel = parseChannel(posted.content);
    expect(channel.messages.filter((m) => m.author === 'Charlie').length).toBe(1);
    expect(channel.messages[1].timestamp).toBe('2026-07-04 11:00:00');
    expect(posted.content).toContain('[FASE 1] avance previo');
    expect(posted.content).toContain('[FASE 2] nuevo hito');
    expect(checkConsecutiveAuthors(posted.content)).toEqual([]);
    expect(posted.content).toContain('Charlie=2026-07-04 11:00:00'); // cursor propio actualizado
  });
});

// ─── Scenario 3 — Excepción de sesión (T1 fila ⊤⊤) ──────────────────────────

describe('Scenario 3 — ACK de nueva sesión se anexa como mensaje nuevo', () => {
  it('último mensaje del autor + cuerpo [ACK H] → APPEND legal (AppendAllowed — NewSession)', () => {
    const handoff = buildHandoff({
      msgs: '### Charlie → Alfa/Bravo · 2026-07-04 10:00:00\n\n[FIN] cierre de sesión previa',
      cursores:
        'Cursores        : Alfa=2026-07-04 10:00:00 · Bravo=2026-07-04 10:00:00 · Charlie=2026-07-04 10:00:00',
    });
    const posted = applyPost(handoff, {
      author: 'Charlie',
      body: '[ACK H] Charlie al día · nueva sesión',
      timestamp: '2026-07-04 12:00:00',
    });
    expect(posted.action).toBe('APPEND');
    const channel = parseChannel(posted.content);
    expect(channel.messages.filter((m) => m.author === 'Charlie').length).toBe(2);
    expect(checkConsecutiveAuthors(posted.content)).toEqual([]); // excepción Regla 12 respetada
  });
});

// ─── Scenario 4 — Rollback ante canal inválido ───────────────────────────────

describe('Scenario 4 — rollback: si un check queda en ⊥ NO se persiste nada', () => {
  it('desync de versión L↔H (I-20) → status invalid, error exacto reportado y archivos intactos', () => {
    const env = writeEnv(buildHandoff({ version: 'V.78.101.469' })); // master declara 470
    const before = fs.readFileSync(env.handoffPath, 'utf8');
    const historicoBefore = fs.readFileSync(env.historicoPath, 'utf8');

    const result = runHPost({
      author: 'Charlie',
      body: '[HITO] post que no debe persistirse',
      ...env,
      now: at('2026-07-04 11:00:00'),
    });
    expect(result.status).toBe('invalid');
    expect((result.errors ?? []).some((e) => e.includes('I-20'))).toBe(true);
    expect(fs.readFileSync(env.handoffPath, 'utf8')).toBe(before); // rollback
    expect(fs.readFileSync(env.historicoPath, 'utf8')).toBe(historicoBefore);
    expect(fs.existsSync(path.join(env.dir, 'H.lock'))).toBe(false); // unlock garantizado
  });
});

// ─── Scenario 5 — Lock TTL y expropiación ────────────────────────────────────

describe('Scenario 5 — lock: exclusión mutua, TTL y expropiación registrada', () => {
  it('lock vigente de otro agente → status lock-held y canal intacto', () => {
    const env = writeEnv(buildHandoff());
    const lockPath = path.join(env.dir, 'H.lock');
    expect(acquireLock(lockPath, 'Alfa', DEFAULT_LOCK_TTL_MS, Date.now()).acquired).toBe(true);
    const before = fs.readFileSync(env.handoffPath, 'utf8');

    const result = runHPost({ author: 'Charlie', body: '[HITO] bloqueado', ...env });
    expect(result.status).toBe('lock-held');
    expect((result.errors ?? [])[0]).toContain('Alfa');
    expect(fs.readFileSync(env.handoffPath, 'utf8')).toBe(before);
    releaseLock(lockPath);
  });

  it('lock con antigüedad > TTL (agente muerto) → expropiación con registro del hecho y post exitoso', () => {
    const env = writeEnv(buildHandoff());
    const lockPath = path.join(env.dir, 'H.lock');
    expect(acquireLock(lockPath, 'Alfa', DEFAULT_LOCK_TTL_MS, Date.now()).acquired).toBe(true);
    // 3 min > TTL 2 min, relativo al reloj inyectado (11:00:00)
    const stale = new Date(new Date('2026-07-04T11:00:00').getTime() - 3 * 60 * 1000);
    fs.utimesSync(lockPath, stale, stale);

    const result = runHPost({
      author: 'Charlie',
      body: '[HITO] tras expropiar',
      ...env,
      now: at('2026-07-04 11:00:00'),
    });
    expect(result.status).toBe('posted');
    expect(result.lockExpropriated?.previousHolder).toBe('Alfa'); // hecho registrado (F1a)
    expect(result.lockExpropriated && result.lockExpropriated.ageMs > DEFAULT_LOCK_TTL_MS).toBe(
      true
    );
  });
});

// ─── Scenario 6 — Idempotencia ───────────────────────────────────────────────

describe('Scenario 6 — idempotencia: reintento del mismo post se deduplica', () => {
  it('reintento con el mismo hash → exit 0 sin duplicar mensaje ni mover cursores', () => {
    const env = writeEnv(buildHandoff());
    const body = '[HITO] post único de Charlie';
    const first = runHPost({ author: 'Charlie', body, ...env, now: at('2026-07-04 11:00:00') });
    expect(first.status).toBe('posted');
    const afterFirst = fs.readFileSync(env.handoffPath, 'utf8');

    const retry = runHPost({ author: 'Charlie', body, ...env, now: at('2026-07-04 11:30:00') });
    expect(retry.status).toBe('duplicate');
    expect(fs.readFileSync(env.handoffPath, 'utf8')).toBe(afterFirst); // ni mensaje ni cursores se movieron
  });

  it('reintento tras EXTEND también se deduplica (el bloque propio ya termina con ese contenido)', () => {
    const handoff = buildHandoff({
      msgs: '### Charlie → Alfa/Bravo · 2026-07-04 10:00:00\n\n[FASE 1] base\n\n[FASE 2] hito extendido',
      cursores:
        'Cursores        : Alfa=2026-07-04 09:00:00 · Bravo=2026-07-04 09:00:00 · Charlie=2026-07-04 10:00:00',
    });
    expect(isDuplicatePost(handoff, 'Charlie', '[FASE 2] hito extendido')).toBe(true);
    expect(isDuplicatePost(handoff, 'Charlie', '[FASE 3] contenido nuevo')).toBe(false);
  });
});

// ─── GC I-19 vía broker ──────────────────────────────────────────────────────

describe('GC I-19 — retirar-tras-archivar con ancla preservada', () => {
  it('applyGC archiva solo lo leído por los 3 (t < min(cursores)) y nunca el último mensaje', () => {
    const handoff = buildHandoff({
      msgs: [
        '### Alfa → Bravo/Charlie · 2026-07-04 09:00:00\n\n[VIEJO 1] leído por todos',
        '### Bravo → Alfa/Charlie · 2026-07-04 09:30:00\n\n[VIEJO 2] leído por todos',
        '### Charlie → Alfa/Bravo · 2026-07-04 10:00:00\n\n[ANCLA] último mensaje',
      ].join('\n\n---\n\n'),
    });
    const gc = applyGC(handoff, '2026-07-04 11:00:00');
    expect(gc.archivedCount).toBe(2);
    expect(gc.content).not.toContain('[VIEJO 1]');
    expect(gc.content).not.toContain('[VIEJO 2]');
    expect(gc.content).toContain('[ANCLA] último mensaje'); // ancla preservada
    expect(gc.content).toContain('GC I-19 vía hPost');
    expect(gc.archivedText).toContain('[VIEJO 1] leído por todos');
    expect(gc.archivedText).toContain('[VIEJO 2] leído por todos');
  });

  it('mensaje ≥ min(cursores) permanece: jamás se archiva lo no leído', () => {
    const handoff = buildHandoff({
      msgs: [
        '### Alfa → Bravo/Charlie · 2026-07-04 09:00:00\n\n[NO LEÍDO POR BRAVO]',
        '### Charlie → Alfa/Bravo · 2026-07-04 10:00:00\n\n[ANCLA]',
      ].join('\n\n---\n\n'),
      cursores:
        'Cursores        : Alfa=2026-07-04 10:00:00 · Bravo=2026-07-04 08:00:00 · Charlie=2026-07-04 10:00:00',
    });
    expect(applyGC(handoff, '2026-07-04 11:00:00').archivedCount).toBe(0);
  });

  it('runHPost aplica el GC end-to-end: retirados del canal y anexados íntegros a HISTORICO', () => {
    const env = writeEnv(
      buildHandoff({
        msgs: [
          '### Alfa → Bravo/Charlie · 2026-07-04 09:00:00\n\n[VIEJO] ya leído por los 3',
          '### Bravo → Alfa/Charlie · 2026-07-04 10:00:00\n\n[RECIENTE] intervención',
        ].join('\n\n---\n\n'),
      })
    );
    const result = runHPost({
      author: 'Charlie',
      body: '[HITO] post que dispara la recolección',
      ...env,
      now: at('2026-07-04 11:00:00'),
    });
    expect(result.status).toBe('posted');
    expect(result.archivedCount).toBe(1);
    const canal = fs.readFileSync(env.handoffPath, 'utf8');
    const historico = fs.readFileSync(env.historicoPath, 'utf8');
    expect(canal).not.toContain('[VIEJO] ya leído por los 3');
    expect(historico).toContain('[VIEJO] ya leído por los 3'); // retirar-tras-archivar
    expect(
      runConsistencyChecks({
        masterContent: buildMaster(),
        claudeContent: CLAUDE_FIXTURE,
        handoffContent: canal,
        invariantsContent: INVARIANTS_FIXTURE,
      })
    ).toEqual([]);
  });
});

// ─── Cabecera: cursor propio y ESTADO ────────────────────────────────────────

describe('Cabecera — cursor propio y bloque ESTADO', () => {
  it('updateCursor solo mueve el cursor del autor', () => {
    const updated = updateCursor(buildHandoff(), 'Bravo', '2026-07-04 12:00:00');
    expect(updated).toContain(
      'Alfa=2026-07-04 10:00:00 · Bravo=2026-07-04 12:00:00 · Charlie=2026-07-04 10:00:00'
    );
  });

  it('updateEstado reemplaza el bloque y rechaza más de 6 líneas (FC 054 F1)', () => {
    const updated = updateEstado(buildHandoff(), [
      'FC activo : FC 061 F1',
      'Versión   : V.78.101.470 · test',
    ]);
    expect(updated).toContain('  FC activo : FC 061 F1');
    expect(() => updateEstado(buildHandoff(), ['1', '2', '3', '4', '5', '6', '7'])).toThrow(
      'máximo 6'
    );
  });
});

// ─── Observación (a) de Bravo — TTL 2 min vs latencia real del pipeline ──────

describe('Observación (a) auditoría Bravo — p99 del pipeline muy por debajo del TTL', () => {
  it('p99 de 100 ejecuciones in-memory del pipeline completo < TTL/10', () => {
    const handoff = buildHandoff();
    const master = buildMaster();
    const durations: number[] = [];
    for (let i = 0; i < 100; i += 1) {
      const t0 = Date.now();
      const posted = applyPost(handoff, {
        author: 'Charlie',
        body: `[HITO ${i}] medición de latencia`,
        timestamp: '2026-07-04 11:00:00',
      });
      const gc = applyGC(posted.content, '2026-07-04 11:00:00');
      runConsistencyChecks({
        masterContent: master,
        claudeContent: CLAUDE_FIXTURE,
        handoffContent: gc.content,
        invariantsContent: INVARIANTS_FIXTURE,
      });
      durations.push(Date.now() - t0);
    }
    durations.sort((a, b) => a - b);
    const p99 = durations[98];
    expect(p99).toBeLessThan(DEFAULT_LOCK_TTL_MS / 10); // 12s de margen sobre un pipeline de ms
  });
});

// ─── Observación (b) de Bravo — atomicidad wx en el entorno real (OneDrive) ──

describe('Observación (b) auditoría Bravo — H.lock `wx` atómico en el directorio real bajo OneDrive', () => {
  it('25 ciclos adquirir/colisionar/liberar sobre Protocolos/North_Star/ son deterministas', () => {
    const nsDir = path.join(ROOT, 'Protocolos', 'North_Star');
    expect(fs.existsSync(nsDir)).toBe(true);
    const lockPath = path.join(nsDir, `H.lock.test-${process.pid}`);
    try {
      for (let i = 0; i < 25; i += 1) {
        const first = acquireLock(lockPath, 'Charlie', DEFAULT_LOCK_TTL_MS, Date.now());
        expect(first.acquired).toBe(true);
        const second = acquireLock(lockPath, 'Alfa', DEFAULT_LOCK_TTL_MS, Date.now());
        expect(second.acquired).toBe(false);
        expect(second.holder).toBe('Charlie');
        releaseLock(lockPath);
      }
    } finally {
      releaseLock(lockPath);
    }
  });
});

// ─── Integración — copia del canal real ──────────────────────────────────────

describe('Integración — runHPost sobre una copia del canal REAL del repo', () => {
  const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

  it('publica un post de Charlie sobre la copia y los 10 checks quedan en ⊤ (el canal vivo no se toca)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hpost-real-'));
    tempDirs.push(dir);
    const env: TempEnv = {
      dir,
      handoffPath: path.join(dir, '002_NS_Handoff.md'),
      historicoPath: path.join(dir, 'HISTORICO_HANDOFF.md'),
      masterPath: path.join(dir, '001_NS_ProtocoloL.md'),
      claudePath: path.join(dir, 'CLAUDE.md'),
      invariantsPath: path.join(dir, '052_NS_MetaLInvariants.md'),
    };
    fs.writeFileSync(env.handoffPath, read('Protocolos/North_Star/002_NS_Handoff.md'), 'utf8');
    fs.writeFileSync(env.historicoPath, '# HISTORICO (copia de prueba)\n', 'utf8');
    fs.writeFileSync(env.masterPath, read('Protocolos/North_Star/001_NS_ProtocoloL.md'), 'utf8');
    fs.writeFileSync(env.claudePath, read('CLAUDE.md'), 'utf8');
    fs.writeFileSync(
      env.invariantsPath,
      read('Protocolos/North_Star/052_NS_MetaLInvariants.md'),
      'utf8'
    );

    const result = runHPost({
      author: 'Charlie',
      body: '[TEST F1] integración hPost sobre copia del canal real — sin efecto en el canal vivo.',
      ...env,
    });
    expect(result.status).toBe('posted');

    const after = fs.readFileSync(env.handoffPath, 'utf8');
    expect(checkHOrder(after)).toEqual([]);
    expect(checkConsecutiveAuthors(after)).toEqual([]);
    expect(
      runConsistencyChecks({
        masterContent: read('Protocolos/North_Star/001_NS_ProtocoloL.md'),
        claudeContent: read('CLAUDE.md'),
        handoffContent: after,
        invariantsContent: read('Protocolos/North_Star/052_NS_MetaLInvariants.md'),
      })
    ).toEqual([]);
  });
});
