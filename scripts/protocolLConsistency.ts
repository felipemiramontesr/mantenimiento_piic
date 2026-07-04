/**
 * FC 053 F7 — L_Self_Verification (Protocolo L V.6.11.15)
 * Pure consistency checks over governance documents. Each check receives file
 * contents as strings and returns an array of error messages (empty = valid),
 * so every rule is unit-testable without touching the filesystem.
 */

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
    errors.push('Canal H: falta la línea "Versión activa : V.x.y.z_..." en la cabecera (I-20).');
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
    ...checkClaudeMdCoherence(input.claudeContent, input.masterContent),
    ...checkHOrder(input.handoffContent),
    ...checkExclusionSetRegistry(input.invariantsContent),
    ...checkCursorTable(input.handoffContent),
    ...checkMinCursorGC(input.handoffContent),
    ...checkConsecutiveAuthors(input.handoffContent),
    ...checkVersionSync(input.masterContent, input.handoffContent),
  ];
}
