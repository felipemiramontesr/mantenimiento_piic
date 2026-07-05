/* eslint-disable no-console */
/**
 * FC 061 F1 — H_Broker_Post · Broker_Core.
 * Única vía de escritura al Canal H (002_NS_Handoff.md). Pipeline:
 * (a) lock atómico `wx` con TTL (expirado = expropiable con registro del hecho) →
 * (b) relectura del H REAL (nunca el snapshot del agente) →
 * (c) decisión por tabla T1: APPEND / EXTEND (auto-consolidación I-6 por construcción) →
 * (d) timestamp del shell tomado DENTRO del lock, al momento de anexar →
 * (e) anexado al final + cabecera (Último mensaje + Fecha + cursor propio + ESTADO opcional) →
 * (f) GC I-19 (retirar-tras-archivar a HISTORICO_HANDOFF, ancla preservada) →
 * (g) runConsistencyChecks in-memory ANTES de persistir — si ⊥, rollback (no escribe) →
 * (h) idempotencia: reintento de un post ya anexado se deduplica (exit 0, cursores intactos) →
 * (i) unlock.
 * Funciones puras exportadas para tests (Regla 19 · R-BDD-GHERKIN).
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { runConsistencyChecks } from './protocolLConsistency';

export const RAPTORS = ['Alfa', 'Bravo', 'Charlie'] as const;
export type Raptor = (typeof RAPTORS)[number];

export const DEFAULT_LOCK_TTL_MS = 2 * 60 * 1000;

const TS_PATTERN = '\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}';
const HEADER_REGEX = new RegExp(`^###\\s+(\\S+)\\s*→\\s*(\\S+)\\s*·\\s*(${TS_PATTERN})\\s*$`);
const CURSOR_REGEX = new RegExp(
  `^(Cursores\\s*:\\s*)Alfa=(${TS_PATTERN})\\s*·\\s*Bravo=(${TS_PATTERN})\\s*·\\s*Charlie=(${TS_PATTERN})\\s*$`,
  'm'
);

export function formatTimestamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${datePart} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function recipientsOf(author: Raptor): string {
  return RAPTORS.filter((r) => r !== author).join('/');
}

export interface ChannelMessage {
  author: string;
  timestamp: string;
  headerLineIndex: number;
  blockStartLineIndex: number;
}

export interface ParsedChannel {
  lines: string[];
  canalLineIndex: number;
  messages: ChannelMessage[];
}

export function parseChannel(handoffContent: string): ParsedChannel {
  const lines = handoffContent.split(/\r?\n/);
  const canalLineIndex = lines.findIndex((l) => l.startsWith('## CANAL DE MENSAJES'));
  const messages: ChannelMessage[] = [];
  if (canalLineIndex === -1) {
    return { lines, canalLineIndex, messages };
  }
  for (let i = canalLineIndex + 1; i < lines.length; i += 1) {
    const match = lines[i].match(HEADER_REGEX);
    if (match) {
      let blockStartLineIndex = i;
      let j = i - 1;
      while (j > canalLineIndex && lines[j].trim() === '') {
        j -= 1;
      }
      if (j > canalLineIndex && lines[j].trim() === '---') {
        blockStartLineIndex = j;
      }
      messages.push({
        author: match[1],
        timestamp: match[3],
        headerLineIndex: i,
        blockStartLineIndex,
      });
    }
  }
  return { lines, canalLineIndex, messages };
}

export function messageBody(channel: ParsedChannel, index: number): string {
  const msg = channel.messages[index];
  const next = channel.messages[index + 1];
  const end = next ? next.blockStartLineIndex : channel.lines.length;
  return channel.lines
    .slice(msg.headerLineIndex + 1, end)
    .join('\n')
    .trim();
}

export function isNewSessionAck(body: string): boolean {
  const first =
    body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l !== '') ?? '';
  return first.startsWith('[ACK L]') || first.startsWith('[ACK H]');
}

/**
 * T1 — Decisión del broker (FC 061): P = SameAuthor(último, autor) · Q = NewSessionACK(post).
 * ⊥⊥→APPEND · ⊥⊤→APPEND · ⊤⊤→APPEND (excepción NewSession de AppendAllowed) ·
 * ⊤⊥→EXTEND (auto-consolidación — I-6 garantizado por construcción).
 * T2 — Loophole cerrado (FC 063 F4): R = el último mensaje del autor ya inicia con [ACK.
 * ⊤⊤⊤→EXTEND — un 2º ACK consecutivo del mismo autor no puede ser una sesión nueva
 * legítima sin intervención de terceros; se consolida en vez de encolar.
 */
export function decideAction(
  sameAuthor: boolean,
  newSessionAck: boolean,
  lastOwnIsAck = false
): 'APPEND' | 'EXTEND' {
  if (!sameAuthor) {
    return 'APPEND';
  }
  return !newSessionAck || lastOwnIsAck ? 'EXTEND' : 'APPEND';
}

/** FC 063 F4 (a) — los agentes pasan \n literales por shell; se expanden a saltos reales. */
export function expandEscapedNewlines(text: string): string {
  return text.split('\\n').join('\n');
}

/** FC 063 F4 (c) — verificación post-write: confirma que la escritura aterrizó íntegra. */
export function confirmPersisted(filePath: string, expected: string): boolean {
  try {
    return fs.readFileSync(filePath, 'utf8') === expected;
  } catch {
    return false;
  }
}

export function hashBody(body: string): string {
  return crypto.createHash('sha256').update(body.trim(), 'utf8').digest('hex');
}

/** Idempotencia (h): el post es duplicado si el último post del autor ya lo contiene al final. */
export function isDuplicatePost(handoffContent: string, author: string, body: string): boolean {
  if (body.trim() === '') {
    return false;
  }
  const channel = parseChannel(handoffContent);
  const ownIndices = channel.messages
    .map((m, i) => ({ author: m.author, i }))
    .filter((x) => x.author === author);
  if (ownIndices.length === 0) {
    return false;
  }
  const lastBody = messageBody(channel, ownIndices[ownIndices.length - 1].i);
  return hashBody(lastBody) === hashBody(body) || lastBody.trimEnd().endsWith(body.trim());
}

function deriveLabel(source: string): string {
  const first =
    source
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l !== '') ?? '';
  const clean = first.replace(/[*[\]`]/g, '').trim();
  return clean.length > 70 ? `${clean.slice(0, 67)}…` : clean;
}

function replaceHeaderValue(content: string, regex: RegExp, value: string, name: string): string {
  if (!regex.test(content)) {
    throw new Error(`hPost: no se encontró la línea "${name}" en la cabecera de H.`);
  }
  return content.replace(regex, (_full, prefix: string) => `${prefix}${value}`);
}

export function updateCursor(content: string, author: Raptor, timestamp: string): string {
  const match = content.match(CURSOR_REGEX);
  if (!match) {
    throw new Error('hPost: no se encontró la tabla "Cursores" en la cabecera de H (I-18).');
  }
  const values: Record<Raptor, string> = { Alfa: match[2], Bravo: match[3], Charlie: match[4] };
  values[author] = timestamp;
  return content.replace(
    CURSOR_REGEX,
    `${match[1]}Alfa=${values.Alfa} · Bravo=${values.Bravo} · Charlie=${values.Charlie}`
  );
}

export function updateEstado(content: string, estadoBody: string[]): string {
  if (estadoBody.length > 6) {
    throw new Error('hPost: el bloque ESTADO admite máximo 6 líneas (FC 054 F1).');
  }
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((l) => /^ESTADO\s*$/.test(l));
  if (start === -1) {
    throw new Error('hPost: no se encontró el bloque "ESTADO" en la cabecera de H.');
  }
  let end = start + 1;
  while (end < lines.length && !/^═|^```/.test(lines[end])) {
    end += 1;
  }
  const replacement = estadoBody.map((l) => `  ${l.trim()}`);
  return [...lines.slice(0, start + 1), ...replacement, ...lines.slice(end)].join('\n');
}

export interface PostInput {
  author: Raptor;
  body: string;
  timestamp: string;
  label?: string;
}

export interface PostOutcome {
  content: string;
  action: 'APPEND' | 'EXTEND';
  label: string;
}

/** (c)+(e) — decisión T1 y anexado/extensión con cabecera actualizada. Función pura. */
export function applyPost(handoffContent: string, input: PostInput): PostOutcome {
  const body = input.body.trim();
  if (body === '') {
    throw new Error('hPost: el cuerpo del mensaje está vacío.');
  }
  if (/^###\s/m.test(body)) {
    throw new Error('hPost: el cuerpo no puede contener encabezados de mensaje ("### ...").');
  }
  const channel = parseChannel(handoffContent);
  if (channel.canalLineIndex === -1) {
    throw new Error('hPost: no se encontró la sección "## CANAL DE MENSAJES" en H.');
  }
  const last = channel.messages[channel.messages.length - 1];
  const sameAuthor = last !== undefined && last.author === input.author;
  const lastOwnIsAck =
    sameAuthor && isNewSessionAck(messageBody(channel, channel.messages.length - 1));
  const action = decideAction(sameAuthor, isNewSessionAck(body), lastOwnIsAck);
  const recipients = recipientsOf(input.author);
  const header = `### ${input.author} → ${recipients} · ${input.timestamp}`;

  let content: string;
  if (action === 'APPEND' || last === undefined) {
    content = `${handoffContent.trimEnd()}\n\n---\n\n${header}\n\n${body}\n`;
  } else {
    const lines = [...channel.lines];
    lines[last.headerLineIndex] = header;
    content = `${lines.join('\n').trimEnd()}\n\n${body}\n`;
  }

  const label = deriveLabel(input.label ?? body);
  content = replaceHeaderValue(
    content,
    /^(Último mensaje\s*:\s*).*$/m,
    `**${input.author} → ${recipients}** · ${input.timestamp} [${label}]`,
    'Último mensaje'
  );
  content = replaceHeaderValue(
    content,
    /^(Fecha\s*:\s*).*$/m,
    input.timestamp.slice(0, 10),
    'Fecha'
  );
  content = updateCursor(content, input.author, input.timestamp);
  return { content, action, label };
}

export interface GCOutcome {
  content: string;
  archivedText: string;
  archivedCount: number;
}

/**
 * (f) — GC I-19: archiva los mensajes con t(m) < min(cursores) conservando siempre
 * el último mensaje como ancla. Retirar-tras-archivar: el texto retirado se entrega
 * en `archivedText` para anexarse a HISTORICO_HANDOFF. Función pura.
 */
export function applyGC(handoffContent: string, nowTimestamp: string): GCOutcome {
  const noop: GCOutcome = { content: handoffContent, archivedText: '', archivedCount: 0 };
  const cursorMatch = handoffContent.match(CURSOR_REGEX);
  const channel = parseChannel(handoffContent);
  if (!cursorMatch || channel.messages.length < 2) {
    return noop;
  }
  const minCursor = [cursorMatch[2], cursorMatch[3], cursorMatch[4]].sort()[0];
  const archivable = channel.messages.slice(0, -1).filter((m) => m.timestamp < minCursor);
  if (archivable.length === 0) {
    return noop;
  }

  const drop = new Set<number>();
  const blocks: string[] = [];
  archivable.forEach((m) => {
    const idx = channel.messages.indexOf(m);
    const end = channel.messages[idx + 1].blockStartLineIndex; // siempre existe: m nunca es el último
    for (let i = m.blockStartLineIndex; i < end; i += 1) {
      drop.add(i);
    }
    blocks.push(channel.lines.slice(m.headerLineIndex, end).join('\n').trimEnd());
  });

  const keptLines = channel.lines.filter((_, i) => !drop.has(i));
  const canalIdx = keptLines.findIndex((l) => l.startsWith('## CANAL DE MENSAJES'));
  let insertAt = canalIdx + 1;
  for (let i = canalIdx + 1; i < keptLines.length; i += 1) {
    if (/^\*\(.*\)\*\s*$/.test(keptLines[i])) {
      insertAt = i + 1;
    }
    if (keptLines[i].startsWith('### ') || keptLines[i].trim() === '---') {
      break;
    }
  }
  const note = `*(${archivable.length} mensaje(s) ${archivable[0].timestamp} → ${
    archivable[archivable.length - 1].timestamp
  } archivados en HISTORICO_HANDOFF.md · ${nowTimestamp} — GC I-19 vía hPost: t(m) < min(cursores)=${minCursor})*`;
  keptLines.splice(insertAt, 0, note);

  const archivedText = `\n---\n\n## GC I-19 vía hPost · ${nowTimestamp} — ${
    archivable.length
  } mensaje(s) archivados (min(cursores)=${minCursor})\n\n${blocks.join('\n\n---\n\n')}\n`;
  return { content: keptLines.join('\n'), archivedText, archivedCount: archivable.length };
}

export interface LockOutcome {
  acquired: boolean;
  expropriated?: { previousHolder: string; ageMs: number };
  holder?: string;
}

/** (a) — lock atómico `wx` con TTL; lock expirado es expropiable con registro del hecho. */
export function acquireLock(
  lockPath: string,
  author: string,
  ttlMs: number,
  nowMs: number
): LockOutcome {
  const payload = JSON.stringify({ author, ts: new Date(nowMs).toISOString() });
  try {
    fs.writeFileSync(lockPath, payload, { flag: 'wx' });
    return { acquired: true };
  } catch (err) {
    if ((err as { code?: string }).code !== 'EEXIST') {
      throw err;
    }
  }
  let previousHolder = 'desconocido';
  let ageMs = 0;
  try {
    previousHolder =
      (JSON.parse(fs.readFileSync(lockPath, 'utf8')) as { author?: string }).author ??
      'desconocido';
    ageMs = nowMs - fs.statSync(lockPath).mtimeMs;
  } catch {
    // el lock desapareció entre el EEXIST y la lectura — reintentar una vez
    try {
      fs.writeFileSync(lockPath, payload, { flag: 'wx' });
      return { acquired: true };
    } catch {
      return { acquired: false, holder: previousHolder };
    }
  }
  if (ageMs > ttlMs) {
    fs.writeFileSync(lockPath, payload);
    return { acquired: true, expropriated: { previousHolder, ageMs } };
  }
  return { acquired: false, holder: previousHolder };
}

export function releaseLock(lockPath: string): void {
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // ya liberado — idempotente
  }
}

export interface HPostOptions {
  author: Raptor;
  body: string;
  label?: string;
  estado?: string[];
  handoffPath: string;
  historicoPath: string;
  masterPath: string;
  claudePath: string;
  invariantsPath: string;
  lockPath?: string;
  lockTtlMs?: number;
  now?: () => Date;
}

export interface HPostResult {
  status: 'posted' | 'duplicate' | 'lock-held' | 'invalid';
  action?: 'APPEND' | 'EXTEND';
  timestamp?: string;
  archivedCount?: number;
  lockExpropriated?: { previousHolder: string; ageMs: number };
  errors?: string[];
}

/** Pipeline completo (a)–(i). Ante cualquier check en ⊥, NO persiste nada (rollback in-memory). */
export function runHPost(options: HPostOptions): HPostResult {
  if (!(RAPTORS as readonly string[]).includes(options.author)) {
    return {
      status: 'invalid',
      errors: [
        `hPost: autor desconocido "${options.author}" — debe ser uno de ${RAPTORS.join('/')}.`,
      ],
    };
  }
  if (options.body.trim() === '') {
    return { status: 'invalid', errors: ['hPost: el cuerpo del mensaje está vacío.'] };
  }
  const now = options.now ?? ((): Date => new Date());
  const ttlMs = options.lockTtlMs ?? DEFAULT_LOCK_TTL_MS;
  const lockPath = options.lockPath ?? path.join(path.dirname(options.handoffPath), 'H.lock');

  const lock = acquireLock(lockPath, options.author, ttlMs, now().getTime());
  if (!lock.acquired) {
    return {
      status: 'lock-held',
      errors: [
        `hPost: H.lock vigente de ${lock.holder ?? 'desconocido'} — reintentar más tarde (TTL ${
          ttlMs / 1000
        }s).`,
      ],
    };
  }
  try {
    const real = fs.readFileSync(options.handoffPath, 'utf8'); // (b) relectura del H REAL
    if (isDuplicatePost(real, options.author, options.body)) {
      return { status: 'duplicate', lockExpropriated: lock.expropriated }; // (h) sin duplicar ni mover cursores
    }
    const timestamp = formatTimestamp(now()); // (d) timestamp DENTRO del lock, al anexar
    const posted = applyPost(real, {
      author: options.author,
      body: options.body,
      timestamp,
      label: options.label,
    });
    const withEstado = options.estado
      ? updateEstado(posted.content, options.estado)
      : posted.content;
    const gc = applyGC(withEstado, timestamp); // (f)
    const errors = runConsistencyChecks({
      masterContent: fs.readFileSync(options.masterPath, 'utf8'),
      claudeContent: fs.existsSync(options.claudePath)
        ? fs.readFileSync(options.claudePath, 'utf8')
        : '',
      handoffContent: gc.content,
      invariantsContent: fs.existsSync(options.invariantsPath)
        ? fs.readFileSync(options.invariantsPath, 'utf8')
        : '',
    });
    if (errors.length > 0) {
      return { status: 'invalid', errors, lockExpropriated: lock.expropriated }; // (g) rollback — nada persistido
    }
    fs.writeFileSync(options.handoffPath, gc.content, 'utf8');
    if (gc.archivedCount > 0) {
      fs.appendFileSync(options.historicoPath, gc.archivedText, 'utf8');
    }
    if (!confirmPersisted(options.handoffPath, gc.content)) {
      // FC 063 F4 (c) — carrera de réplicas: la escritura no aterrizó íntegra
      return {
        status: 'invalid',
        errors: [
          'hPost: verificación post-write falló — H en disco no coincide con lo publicado (carrera de réplicas OneDrive); releer H real y reintentar.',
        ],
        lockExpropriated: lock.expropriated,
      };
    }
    return {
      status: 'posted',
      action: posted.action,
      timestamp,
      archivedCount: gc.archivedCount,
      lockExpropriated: lock.expropriated,
    };
  } catch (err) {
    return {
      status: 'invalid',
      errors: [(err as Error).message],
      lockExpropriated: lock.expropriated,
    };
  } finally {
    releaseLock(lockPath); // (i)
  }
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

interface CliArgs {
  author?: string;
  message?: string;
  file?: string;
  label?: string;
  estado?: string;
}

function parseArgs(argv: string[]): CliArgs | null {
  const args: CliArgs = {};
  const flags: Record<string, keyof CliArgs> = {
    '--author': 'author',
    '--message': 'message',
    '--file': 'file',
    '--label': 'label',
    '--estado': 'estado',
  };
  for (let i = 0; i < argv.length; i += 2) {
    const key = flags[argv[i]];
    if (!key || argv[i + 1] === undefined) {
      console.error(`${RED}[hPost]${RESET} Argumento inválido: ${argv[i]}`);
      return null;
    }
    args[key] = argv[i + 1];
  }
  return args;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args || !args.author || (!args.message && !args.file)) {
    console.error(
      `${YELLOW}Uso:${RESET} bun scripts/hPost.ts --author <Alfa|Bravo|Charlie> (--message "..." | --file <ruta>) [--label "..."] [--estado "l1\\nl2"]`
    );
    process.exit(2);
  }
  const root = path.join(__dirname, '..');
  const ns = path.join(root, 'Protocolos', 'North_Star');
  const result = runHPost({
    author: args.author as Raptor,
    // FC 063 F4 (a): --message expande \n literales; --file se respeta tal cual
    body: args.message
      ? expandEscapedNewlines(args.message)
      : fs.readFileSync(args.file as string, 'utf8'),
    label: args.label,
    estado: args.estado ? args.estado.split('\\n') : undefined,
    handoffPath: path.join(ns, '002_NS_Handoff.md'),
    historicoPath: path.join(ns, 'HISTORICO_HANDOFF.md'),
    masterPath: path.join(ns, '001_NS_ProtocoloL.md'),
    claudePath: path.join(root, 'CLAUDE.md'),
    invariantsPath: path.join(ns, '052_NS_MetaLInvariants.md'),
  });

  if (result.lockExpropriated) {
    console.log(
      `${YELLOW}[WARN]${RESET} Lock expirado de ${
        result.lockExpropriated.previousHolder
      } expropiado (antigüedad ${Math.round(
        result.lockExpropriated.ageMs / 1000
      )}s > TTL) — hecho registrado (FC 061 F1a).`
    );
  }
  if (result.status === 'posted') {
    console.log(
      `${GREEN}[OK]${RESET} ${result.action} publicado · ${result.timestamp} · GC I-19: ${result.archivedCount} mensaje(s) archivados · 10 checks ⊤.`
    );
    process.exit(0);
  }
  if (result.status === 'duplicate') {
    console.log(
      `${GREEN}[OK]${RESET} Post idempotente: ya es el último post del autor — nada que hacer.`
    );
    process.exit(0);
  }
  (result.errors ?? []).forEach((e) => console.error(`${RED}[ERROR hPost]${RESET} ${e}`));
  process.exit(result.status === 'lock-held' ? 1 : 2);
}

const isDirectRun = /hPost\.(ts|js)$/.test(process.argv[1] ?? '');
if (isDirectRun) {
  main();
}
