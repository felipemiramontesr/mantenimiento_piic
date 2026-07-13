/**
 * FC 053 F7 — L_Self_Verification (Protocolo L V.6.11.15)
 * Pure consistency checks over governance documents. Each check receives file
 * contents as strings and returns an array of error messages (empty = valid),
 * so every rule is unit-testable without touching the filesystem.
 * FC 063 F2 — Clausula_L_Hash: computeLHash/shouldReRead (Regla 9 · R-L-CONTEXT).
 */
import * as crypto from 'crypto';

const SPANISH_COUNT_WORDS: Record<string, number> = {
  VEINTE: 20,
  VEINTIUN: 21,
  VEINTIUNA: 21,
  VEINTIUNO: 21,
  VEINTIDOS: 22,
  VEINTITRES: 23,
  VEINTICUATRO: 24,
  VEINTICINCO: 25,
  VEINTISEIS: 26,
  VEINTISIETE: 27,
  VEINTIOCHO: 28,
  VEINTINUEVE: 29,
  TREINTA: 30,
};

export const DESTRUCTIVE_OPS = ['git push -f', 'git reset --hard', 'rm -rf', 'git clean -f'];

// Regex con marcas diacríticas combinantes literales (rango U+0300–U+036F tras NFD)
function normalizeWord(word: string): string {
  return word.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

function extractSection(content: string, startMarker: string, endMarker: string): string | null {
  const start = content.indexOf(startMarker);
  if (start === -1) {
    return null;
  }
  const end = content.indexOf(endMarker, start + startMarker.length);
  if (end === -1) {
    return null;
  }
  return content.substring(start, end);
}

/**
 * Check A — Registro de reglas §5 (FC 053 F4/F7):
 * título = conteo real · sin ordinales/IDs duplicados · tabla §5.0 ≡ reglas inline §5.1.
 */
export function checkRuleRegistry(masterContent: string): string[] {
  const errors: string[] = [];

  const titleMatch = masterContent.match(
    /## SECCIÓN 5: MODELO DE OPERACIÓN AUTÓNOMA \(LAS (\S+) REGLAS\)/
  );
  if (!titleMatch) {
    return [
      '§5: no se encontró el título "SECCIÓN 5: MODELO DE OPERACIÓN AUTÓNOMA (LAS ... REGLAS)".',
    ];
  }
  const declaredCount = SPANISH_COUNT_WORDS[normalizeWord(titleMatch[1])];
  if (declaredCount === undefined) {
    errors.push(`§5: palabra de conteo no reconocida en el título: "${titleMatch[1]}".`);
  }

  const registrySection = extractSection(masterContent, '### 5.0', '### 5.1');
  if (!registrySection) {
    return errors.concat([
      '§5.0: no existe el Registro de Identificadores Inmutables (FC 053 F4).',
    ]);
  }
  const registryPairs = Array.from(registrySection.matchAll(/(\d+)\s*\|\s*`(R-[A-Z0-9-]+)`/g)).map(
    (m) => ({ ordinal: Number(m[1]), id: m[2] })
  );

  const rulesSection = extractSection(masterContent, '### 5.1', '### 5.2');
  if (!rulesSection) {
    return errors.concat(['§5.1: no se encontró la sección de reglas (delimitada por §5.2).']);
  }
  const inlineRules = Array.from(
    rulesSection.matchAll(/^(\d+)\.\s+\*\*\[`(R-[A-Z0-9-]+)`\]/gm)
  ).map((m) => ({ ordinal: Number(m[1]), id: m[2] }));

  const duplicateOf = (values: (string | number)[]): (string | number)[] =>
    values.filter((v, i) => values.indexOf(v) !== i);

  const dupInlineOrdinals = duplicateOf(inlineRules.map((r) => r.ordinal));
  if (dupInlineOrdinals.length > 0) {
    errors.push(
      `§5.1: números de regla duplicados: ${[...new Set(dupInlineOrdinals)].join(', ')}.`
    );
  }
  const dupInlineIds = duplicateOf(inlineRules.map((r) => r.id));
  if (dupInlineIds.length > 0) {
    errors.push(`§5.1: IDs de regla duplicados: ${[...new Set(dupInlineIds)].join(', ')}.`);
  }
  const dupRegistryIds = duplicateOf(registryPairs.map((r) => r.id));
  if (dupRegistryIds.length > 0) {
    errors.push(`§5.0: IDs duplicados en el registro: ${[...new Set(dupRegistryIds)].join(', ')}.`);
  }

  if (declaredCount !== undefined && inlineRules.length !== declaredCount) {
    errors.push(
      `§5: el título declara ${declaredCount} reglas pero §5.1 contiene ${inlineRules.length}.`
    );
  }
  if (registryPairs.length !== inlineRules.length) {
    errors.push(
      `§5.0/§5.1: el registro mapea ${registryPairs.length} reglas pero §5.1 define ${inlineRules.length}.`
    );
  }

  const registryById = new Map(registryPairs.map((r) => [r.id, r.ordinal]));
  inlineRules.forEach((rule) => {
    const mapped = registryById.get(rule.id);
    if (mapped === undefined) {
      errors.push(`§5.0: la regla ${rule.ordinal} (${rule.id}) no aparece en el registro.`);
    } else if (mapped !== rule.ordinal) {
      errors.push(
        `§5.0/§5.1: ${rule.id} mapea al ordinal ${mapped} en el registro pero es la regla ${rule.ordinal} inline.`
      );
    }
  });

  return errors;
}

/** Check B — Bloque FEATURE CONTRACT ACTIVO bien formado. */
export function checkFcActivo(masterContent: string): string[] {
  const errors: string[] = [];
  const section = extractSection(masterContent, '## FEATURE CONTRACT ACTIVO', '## ÍNDICE');
  if (!section) {
    return ['FC ACTIVO: no se encontró la sección "## FEATURE CONTRACT ACTIVO" antes del ÍNDICE.'];
  }
  if (!/```[\s\S]*?FC \S+[\s\S]*?```/.test(section)) {
    errors.push('FC ACTIVO: el bloque no contiene una línea "FC <nombre>" dentro del fence.');
  }
  if (!/Estado:\s*\S+/.test(section)) {
    errors.push('FC ACTIVO: el bloque no declara línea "Estado:".');
  }
  return errors;
}

/** Check C — Formato de versiones: VERSIÓN ACTUAL del proyecto y versión del protocolo. */
export function checkVersionFormat(masterContent: string): string[] {
  const errors: string[] = [];
  if (!/VERSIÓN ACTUAL:\s*V\.\d+\.\d+\.\d+_[A-Za-z][A-Za-z0-9_]*/.test(masterContent)) {
    errors.push('VERSIÓN ACTUAL: formato inválido — se espera "V.MAJOR.MINOR.PATCH_Descriptor".');
  }
  if (!/\*\*Versión del Protocolo\*\*\s*\|\s*`V\.\d+\.\d+\.\d+`/.test(masterContent)) {
    errors.push('Header: "Versión del Protocolo" ausente o con formato inválido (V.x.y.z).');
  }
  return errors;
}

/**
 * Check D — Coherencia CLAUDE.md ↔ L (FC 053 F6):
 * sin re-enunciación de reglas, puntero SSOT presente, conteos citados = conteo real,
 * citas de operaciones destructivas presentes en ambos documentos.
 */
export function checkClaudeMdCoherence(claudeContent: string, masterContent: string): string[] {
  const errors: string[] = [];

  if (/REGLAS DE OPERACIÓN AUTÓNOMA/i.test(claudeContent)) {
    errors.push(
      'CLAUDE.md: contiene la sección "REGLAS DE OPERACIÓN AUTÓNOMA" — re-enunciación prohibida (SSOT F6).'
    );
  }
  if (!/FUENTE ÚNICA DE VERDAD/i.test(claudeContent)) {
    errors.push('CLAUDE.md: falta la sección "FUENTE ÚNICA DE VERDAD" (SSOT F6).');
  }
  if (!claudeContent.includes('001_NS_ProtocoloL.md')) {
    errors.push('CLAUDE.md: falta el puntero normativo a 001_NS_ProtocoloL.md.');
  }

  const titleMatch = masterContent.match(
    /## SECCIÓN 5: MODELO DE OPERACIÓN AUTÓNOMA \(LAS (\S+) REGLAS\)/
  );
  const declaredCount = titleMatch ? SPANISH_COUNT_WORDS[normalizeWord(titleMatch[1])] : undefined;
  if (declaredCount !== undefined) {
    const countMentions = Array.from(claudeContent.matchAll(/Las (\S+) Reglas/gi));
    countMentions.forEach((mention) => {
      const mentioned = SPANISH_COUNT_WORDS[normalizeWord(mention[1])];
      if (mentioned !== undefined && mentioned !== declaredCount) {
        errors.push(
          `CLAUDE.md: menciona "Las ${mention[1]} Reglas" pero L §5 declara ${declaredCount} — deriva de conteo.`
        );
      }
    });
  }

  DESTRUCTIVE_OPS.forEach((op) => {
    if (!claudeContent.includes(op)) {
      errors.push(`CLAUDE.md: falta la cita de la operación destructiva "${op}" (L §5.3).`);
    }
    if (!masterContent.includes(op)) {
      errors.push(`L §5.3: falta la operación destructiva "${op}" citada por CLAUDE.md.`);
    }
  });

  return errors;
}

/**
 * Check E — Orden temporal del Canal H (FC 053 F2 · invariante I-7):
 * ValidOrder(mᵢ, mⱼ) ≡ tᵢ < tⱼ ∨ (tᵢ = tⱼ ∧ seqᵢ < seqⱼ).
 * El escaneo secuencial del archivo ES el desempate por seq: dos timestamps
 * iguales en orden de archivo son válidos; un timestamp que retrocede, no.
 */
export function checkHOrder(handoffContent: string): string[] {
  const errors: string[] = [];
  const canalIndex = handoffContent.indexOf('## CANAL DE MENSAJES');
  if (canalIndex === -1) {
    return ['Canal H: no se encontró la sección "## CANAL DE MENSAJES".'];
  }
  const canal = handoffContent.substring(canalIndex);
  const headers = Array.from(
    canal.matchAll(/^###\s+.+·\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s*$/gm)
  ).map((m) => m[1]);

  if (headers.length === 0) {
    return ['Canal H: no se encontró ningún mensaje con timestamp válido.'];
  }

  for (let i = 1; i < headers.length; i += 1) {
    if (headers[i] < headers[i - 1]) {
      errors.push(
        `Canal H: violación de ValidOrder — el mensaje #${i + 1} (${
          headers[i]
        }) retrocede respecto a #${i} (${headers[i - 1]}).`
      );
    }
  }
  return errors;
}

/**
 * Check F — Registro canónico ExclusionSet en 052 (FC 053 F3 · I-9):
 * debe existir y toda entrada debe declarar causa técnica no vacía.
 */
export function checkExclusionSetRegistry(invariantsContent: string): string[] {
  const errors: string[] = [];
  const marker = 'REGISTRO CANÓNICO ExclusionSet';
  const start = invariantsContent.indexOf(marker);
  if (start === -1) {
    return ['052 I-9: no existe el "REGISTRO CANÓNICO ExclusionSet" (FC 053 F3).'];
  }
  const section = invariantsContent.substring(start, invariantsContent.indexOf('##', start));
  const rows = Array.from(section.matchAll(/^\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|/gm));
  if (rows.length === 0) {
    errors.push('052 I-9: el registro ExclusionSet no contiene ninguna entrada tabulada.');
  }
  rows.forEach((row) => {
    const [, file, lines, cause] = row;
    if (!lines.trim() || !cause.trim() || /^—|^-$/.test(cause.trim())) {
      errors.push(`052 I-9: entrada de ExclusionSet sin líneas o sin causa técnica: ${file}.`);
    }
  });
  return errors;
}

const TS_PATTERN = '\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}';
const CURSOR_LINE_REGEX = new RegExp(
  `^Cursores\\s*:\\s*Alfa=(${TS_PATTERN})\\s*·\\s*Bravo=(${TS_PATTERN})\\s*·\\s*Charlie=(${TS_PATTERN})\\s*$`,
  'm'
);

function extractMessageTimestamps(handoffContent: string): string[] {
  const canalIndex = handoffContent.indexOf('## CANAL DE MENSAJES');
  if (canalIndex === -1) {
    return [];
  }
  return Array.from(
    handoffContent
      .substring(canalIndex)
      .matchAll(/^###\s+.+·\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s*$/gm)
  ).map((m) => m[1]);
}

/**
 * Check G — Tabla Cursores y bloque ESTADO en cabecera de H (FC 054 F5 · I-18):
 * CursorValid(r) ≡ formato válido ∧ cursor(r) ≤ t(último mensaje). Ω exento.
 * Los timestamps YYYY-MM-DD HH:MM:SS comparan correctamente como strings.
 */
export function checkCursorTable(handoffContent: string): string[] {
  const errors: string[] = [];

  const cursorMatch = handoffContent.match(CURSOR_LINE_REGEX);
  if (!cursorMatch) {
    errors.push(
      'Canal H: falta la tabla "Cursores : Alfa=... · Bravo=... · Charlie=..." en la cabecera (I-18, FC 054).'
    );
  } else {
    const timestamps = extractMessageTimestamps(handoffContent);
    const lastMessage = timestamps[timestamps.length - 1];
    if (lastMessage !== undefined) {
      const raptors = ['Alfa', 'Bravo', 'Charlie'];
      raptors.forEach((raptor, i) => {
        const cursor = cursorMatch[i + 1];
        if (cursor > lastMessage) {
          errors.push(
            `Canal H: cursor(${raptor})=${cursor} apunta más allá del último mensaje (${lastMessage}) — CursorValid = ⊥ (I-18).`
          );
        }
      });
    }
  }

  const estadoMatch = handoffContent.match(/^ESTADO\s*$/m);
  if (!estadoMatch || estadoMatch.index === undefined) {
    errors.push('Canal H: falta el bloque "ESTADO" en la cabecera (FC 054 F1).');
  } else {
    const afterEstado = handoffContent.substring(estadoMatch.index).split(/\r?\n/);
    let bodyLines = 0;
    for (let i = 1; i < afterEstado.length; i += 1) {
      if (/^═|^```/.test(afterEstado[i])) {
        break;
      }
      bodyLines += 1;
    }
    if (bodyLines > 6) {
      errors.push(`Canal H: el bloque ESTADO tiene ${bodyLines} líneas — máximo 6 (FC 054 F1).`);
    }
  }

  return errors;
}

/**
 * Check H — GC por mínimo aplicado (FC 054 F5 · I-19):
 * GC-Aplicado(H) ≡ ∀m ∈ H_activo \ {último} : t(m) ≥ min(cursores).
 * El último mensaje se conserva siempre como ancla de continuidad.
 */
export function checkMinCursorGC(handoffContent: string): string[] {
  const cursorMatch = handoffContent.match(CURSOR_LINE_REGEX);
  if (!cursorMatch) {
    return []; // sin tabla no hay GC evaluable — checkCursorTable ya reporta la ausencia
  }
  const minCursor = [cursorMatch[1], cursorMatch[2], cursorMatch[3]].sort()[0];
  const timestamps = extractMessageTimestamps(handoffContent);

  const errors: string[] = [];
  for (let i = 0; i < timestamps.length - 1; i += 1) {
    if (timestamps[i] < minCursor) {
      errors.push(
        `Canal H: recolección pendiente — el mensaje #${i + 1} (${
          timestamps[i]
        }) está por debajo de min(cursores)=${minCursor} y ya fue leído por los 3 Raptors; archivarlo en HISTORICO_HANDOFF (I-19).`
      );
    }
  }
  return errors;
}

/**
 * Check I — Compactación de autores consecutivos (FC 056 F2 · I-6 · R-H-COMPACT):
 * ViolatesCompact(i) ≡ Author(mᵢ) = Author(mᵢ₊₁) ∧ ¬NewSessionACK(mᵢ₊₁).
 * NewSessionACK(m) ≡ el cuerpo inicia con "[ACK L]" o "[ACK H]" (marcador Regla 12
 * de la excepción formal AppendAllowed — FC 053 F1). Limitación declarada: el
 * marcador es falsificable; este check es anti-deriva, no anti-adversario.
 */
export function checkConsecutiveAuthors(handoffContent: string): string[] {
  const canalIndex = handoffContent.indexOf('## CANAL DE MENSAJES');
  if (canalIndex === -1) {
    return []; // checkHOrder ya reporta la ausencia del canal
  }
  const lines = handoffContent.substring(canalIndex).split(/\r?\n/);
  const headerRegex = /^###\s+(\S+)\s*→.*·\s+\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\s*$/;

  const messages: { author: string; firstBodyLine: string; ordinal: number }[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(headerRegex);
    if (match) {
      let firstBodyLine = '';
      for (let j = i + 1; j < lines.length; j += 1) {
        if (lines[j].match(headerRegex)) {
          break;
        }
        if (lines[j].trim() !== '') {
          firstBodyLine = lines[j].trim();
          break;
        }
      }
      messages.push({ author: match[1], firstBodyLine, ordinal: messages.length + 1 });
    }
  }

  const errors: string[] = [];
  for (let i = 1; i < messages.length; i += 1) {
    const prev = messages[i - 1];
    const curr = messages[i];
    const isNewSessionAck =
      curr.firstBodyLine.startsWith('[ACK L]') || curr.firstBodyLine.startsWith('[ACK H]');
    if (curr.author === prev.author && !isNewSessionAck) {
      errors.push(
        `Canal H: cola de autor consecutivo — mensajes #${prev.ordinal} y #${curr.ordinal} son de ${curr.author} sin ACK de nueva sesión; consolidar en 1 bloque (I-6 · R-H-COMPACT).`
      );
    }
  }
  return errors;
}

/**
 * Check J — Sincronía de versiones L ↔ H (FC 057 · I-20):
 * VersionSync ≡ ver(L) = ver(H_header) ∧ ver(L) = ver(H_ESTADO).
 * Caso empírico: header H fosilizado en 467 con L y ESTADO en 468 — detectado
 * por Ω porque verifyVersions legacy solo corre con archivos apps/** staged.
 */
export function checkVersionSync(masterContent: string, handoffContent: string): string[] {
  const errors: string[] = [];
  const lVer = masterContent.match(/VERSIÓN ACTUAL:\s*(V\.\d+\.\d+\.\d+)/)?.[1];
  if (!lVer) {
    return []; // checkVersionFormat ya reporta el formato inválido de L
  }
  const headerVer = handoffContent.match(/Versión activa\s*:\s*(V\.\d+\.\d+\.\d+)/)?.[1];
  const estadoVer = handoffContent.match(/^\s+Versión\s*:\s*(V\.\d+\.\d+\.\d+)/m)?.[1];

  if (!headerVer) {
    errors.push('Canal H: falta la línea "Versión activa" (V.x.y.z_...) en la cabecera (I-20).');
  } else if (headerVer !== lVer) {
    errors.push(
      `Versión desincronizada: L declara ${lVer} pero la cabecera de H declara ${headerVer} (I-20 · FC 057).`
    );
  }
  if (estadoVer !== undefined && estadoVer !== lVer) {
    errors.push(
      `Versión desincronizada: L declara ${lVer} pero el bloque ESTADO de H declara ${estadoVer} (I-20 · FC 057).`
    );
  }
  return errors;
}

/** FC 063 F3 — Dieta de Mensajes: entrada en vigor (mensajes anteriores exentos). */
export const DIET_ENACTED = '2026-07-04 23:00:00';
const DIET_MAX_RUN = 6;

/**
 * Check K — Dieta de Mensajes (FC 063 F3 · L §2.2):
 * el límite de 6 líneas de cuerpo aplica POR PUBLICACIÓN. En bloques extendidos
 * por el broker cada publicación es una racha de líneas no vacías separada por
 * línea en blanco — se valida la racha máxima. Mensajes con t < DIET_ENACTED
 * quedan exentos (grandfathered — el canal histórico no se re-litiga).
 */
export function checkMessageDiet(handoffContent: string): string[] {
  const canalIndex = handoffContent.indexOf('## CANAL DE MENSAJES');
  if (canalIndex === -1) {
    return []; // checkHOrder ya reporta la ausencia del canal
  }
  const lines = handoffContent.substring(canalIndex).split(/\r?\n/);
  const headerRegex = /^###\s+(\S+)\s*→.*·\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s*$/;

  const errors: string[] = [];
  let author = '';
  let timestamp = '';
  let run = 0;
  const closeRun = (): void => {
    if (timestamp >= DIET_ENACTED && run > DIET_MAX_RUN) {
      errors.push(
        `Canal H: publicación de ${author} (${timestamp}) con ${run} líneas de cuerpo — máximo ${DIET_MAX_RUN} por publicación (Dieta de Mensajes · FC 063 F3).`
      );
    }
    run = 0;
  };
  lines.forEach((line) => {
    const header = line.match(headerRegex);
    if (header) {
      closeRun();
      [, author, timestamp] = header;
    } else if (line.trim() === '' || line.trim() === '---') {
      closeRun();
    } else if (timestamp !== '') {
      run += 1;
    }
  });
  closeRun();
  return errors;
}

/**
 * FC 063 F2 — Hash canónico del contexto L (Cláusula L por hash · Regla 9).
 * Orden y contenido sensibles: [L-CORE, ...anexos de Libros requeridos].
 * Uso: bun -e "const{computeLHash}=require('./scripts/protocolLConsistency.ts');..."
 * El agente registra en F el hash leído — verificable post-hoc.
 */
const LHASH_SEPARATOR = String.fromCharCode(0); // NUL — imposible en markdown: evita colisiones de frontera

export function computeLHash(contents: string[]): string {
  const hash = crypto.createHash('sha256');
  contents.forEach((content) => {
    hash.update(content, 'utf8');
    hash.update(LHASH_SEPARATOR);
  });
  return hash.digest('hex').slice(0, 12);
}

/**
 * FC 063 F2 — T1: ReRead(L) ≡ HashChanged ∨ NewSession.
 * Fila ⊥⊥ = contexto vigente — la relectura física es innecesaria.
 */
export function shouldReRead(hashChanged: boolean, newSession: boolean): boolean {
  return hashChanged || newSession;
}

/**
 * L V.6.17.0 — Gate duro: L-CORE debe contener §0.5 RAPTOR CONDUCT + IDs A1/ROE.
 */
export function checkRaptorConduct(masterContent: string): string[] {
  const errors: string[] = [];
  if (!/0\.5\s+RAPTOR CONDUCT|RAPTOR CONDUCT — Asimov/i.test(masterContent)) {
    errors.push('L-CORE: falta §0.5 RAPTOR CONDUCT (Asimov-L + ROE).');
  }
  [
    'R-A1-HARM',
    'R-A2-CHAIN',
    'R-A3-CONTEXT',
    'R-ROE-MISSION',
    'R-A0-HUMAN',
    'R-A1-DECLARE',
  ].forEach((id) => {
    if (!masterContent.includes(id)) {
      errors.push(`L-CORE: falta ID de conduct ${id}.`);
    }
  });
  if (!/\*\*A0\*\*|A0.*Solo GrayMan|A0.*solo GrayMan/i.test(masterContent)) {
    errors.push('L-CORE: A0 (Zeroth solo Ω) no declarado de forma explícita.');
  }
  return errors;
}

/**
 * L V.6.17.0 — Plantilla §4.1 debe exigir declaración A1 en FC de producto.
 */
export function checkFcTemplateA1(masterContent: string): string[] {
  const errors: string[] = [];
  if (!/A1 dominio\s*:/i.test(masterContent)) {
    errors.push('Plantilla FC §4.1: falta campo obligatorio "A1 dominio :".');
  }
  if (!/R-DICTAMEN-A1|DICTAMEN \(producto/i.test(masterContent)) {
    errors.push('Plantilla FC §4.1: falta bloque DICTAMEN producto / R-DICTAMEN-A1.');
  }
  return errors;
}

/**
 * FC de producto debe declarar A1 (R-A1-DECLARE).
 * Heurística: si el FC declara FEATURE CONTRACT y no es solo meta-tooling sin código,
 * exige línea A1 dominio (o "proceso-only").
 * FCs históricos sin el campo fallan solo cuando se evalúan explícitamente (verify path).
 */
export function checkFcA1Declaration(fcContent: string): string[] {
  if (!/FEATURE CONTRACT/i.test(fcContent)) {
    return [];
  }
  // Exempt pure study / no-code historical if marked
  if (
    /estudio sin c[oó]digo|SIN c[oó]digo de producto|gobernanza pura, cero cambios/i.test(
      fcContent
    ) &&
    !/apps\//i.test(fcContent)
  ) {
    // still prefer A1 proceso-only but do not hard-fail pure governance docs without apps
    if (/Requiere OLR\s*:\s*\[\s*x\s*\]\s*No/i.test(fcContent) && !/apps\//i.test(fcContent)) {
      return [];
    }
  }
  if (!/A1 dominio\s*:|A1\s*dominio\s*:|^\s*A1\s*:/im.test(fcContent)) {
    return [
      'FC de producto sin "A1 dominio :" (R-A1-DECLARE). Declarar clases A1-ARCHON o proceso-only + justificación.',
    ];
  }
  return [];
}

/**
 * FC 068 F2 — Gate OLR (§19.1/§19.2/§20.1). Función pura, NO wired en
 * runConsistencyChecks (condición 2 de Bravo — el gate OLR solo se evalúa cuando
 * hay código real staged, nunca en la verificación incondicional de L). Se invoca
 * directamente desde verifyProtocolL.ts dentro de la rama codeFiles.length > 0.
 * Firmantes: O=Alfa|Charlie · L=GrayMan · R=Bravo (L V.6.15+).
 */
export function checkOlrApproval(fcContent: string): string[] {
  const requiereMatch = fcContent.match(/Requiere OLR\s*:\s*\[( |x)\]\s*S[ií]\s*\[( |x)\]\s*No/i);
  if (!requiereMatch || requiereMatch[1].toLowerCase() !== 'x') {
    return []; // FC no declara el campo (retrocompat) o declara "No" — nada que verificar
  }

  const errors: string[] = [];
  (['O', 'L', 'R'] as const).forEach((filtro) => {
    const lineMatch = fcContent.match(
      new RegExp(`-\\s*\\[( |x)\\]\\s*${filtro}\\s*\\[[^\\]]+\\]\\s*—[^:]*:\\s*(.*)$`, 'm')
    );
    if (!lineMatch) {
      errors.push(
        `OLR: el FC declara "Requiere OLR: Sí" pero no tiene la línea de aprobación del filtro ${filtro} (§19.2).`
      );
      return;
    }
    const [, box, rest] = lineMatch;
    const signed = box.toLowerCase() === 'x' && rest.trim() !== '' && rest.trim() !== '[Fecha]';
    if (!signed) {
      errors.push(
        `OLR: FC declara "Requiere OLR: Sí" pero el filtro ${filtro} no tiene firma completa — usar scripts/olrSign.ts.`
      );
    }
  });
  return errors;
}

export interface ConsistencyInput {
  masterContent: string;
  claudeContent: string;
  handoffContent: string;
  invariantsContent: string;
}

/** Ejecuta todos los chequeos de consistencia de L. Retorna la lista completa de errores. */
export function runConsistencyChecks(input: ConsistencyInput): string[] {
  return [
    ...checkRuleRegistry(input.masterContent),
    ...checkFcActivo(input.masterContent),
    ...checkVersionFormat(input.masterContent),
    ...checkRaptorConduct(input.masterContent),
    ...checkFcTemplateA1(input.masterContent),
    ...checkClaudeMdCoherence(input.claudeContent, input.masterContent),
    ...checkHOrder(input.handoffContent),
    ...checkExclusionSetRegistry(input.invariantsContent),
    ...checkCursorTable(input.handoffContent),
    ...checkMinCursorGC(input.handoffContent),
    ...checkConsecutiveAuthors(input.handoffContent),
    ...checkVersionSync(input.masterContent, input.handoffContent),
    ...checkMessageDiet(input.handoffContent),
  ];
}
