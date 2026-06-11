/* eslint-disable no-console */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Colores para consola
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function logError(msg: string): void {
  console.error(`${RED}[ERROR DE PROTOCOLO L]${RESET} ${msg}`);
}

function logSuccess(msg: string): void {
  console.log(`${GREEN}[OK]${RESET} ${msg}`);
}

function logWarn(msg: string): void {
  console.log(`${YELLOW}[WARN]${RESET} ${msg}`);
}

function runCommand(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// 1. Guard: No permitir archivos de Protocolos/ o CLAUDE.md en Git Staged
function verifyNoProtocolStaged(stagedFiles: string[]): void {
  const protocolStagedFiles = stagedFiles.filter((file) => {
    const lower = file.toLowerCase();
    return lower.startsWith('protocolos/') || lower === 'claude.md';
  });

  if (protocolStagedFiles.length > 0) {
    logError(
      `Se detectaron archivos locales protegidos (Protocolos/ o CLAUDE.md) en git staged:\n${protocolStagedFiles.join(
        '\n'
      )}\nEstos archivos son estrictamente locales y están en .gitignore. Remuévelos con:\n` +
        `  git restore --staged <archivo>`
    );
    process.exit(1);
  }
}

// 2. Verificar existencia de archivos locales L, H y F
function verifyFilesExist(masterPath: string, handoffPath: string, forensePath: string): void {
  if (!fs.existsSync(masterPath)) {
    logError(`No existe el archivo maestro en: ${masterPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(handoffPath)) {
    logError(`No existe el archivo de handoff en: ${handoffPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(forensePath)) {
    logError(`No existe el archivo forense en: ${forensePath}`);
    process.exit(1);
  }
}

// 3. Verificar mtime (modificación reciente en los últimos 30 minutos)
function verifyModificationTimes(
  masterPath: string,
  handoffPath: string,
  forensePath: string
): void {
  const now = Date.now();
  const timeLimit = 30 * 60 * 1000; // 30 minutos

  const filesToCheck = [
    { name: 'PROTOCOLO_L.md', path: masterPath },
    { name: 'HANDOFF_CC_TO_AG.md', path: handoffPath },
    { name: 'LOG_FORENSE.md', path: forensePath },
  ];

  filesToCheck.forEach((file) => {
    const stats = fs.statSync(file.path);
    const diff = now - stats.mtime.getTime();
    if (diff > timeLimit) {
      logError(
        `El archivo ${
          file.name
        } no ha sido modificado recientemente (última modificación hace ${Math.round(
          diff / 60000
        )} minutos).\n` +
          `Según el Protocolo L §13.1.1, antes de commitear debes actualizar localmente:\n` +
          `  1. PROTOCOLO_L.md (Bumpear VERSIÓN ACTUAL)\n` +
          `  2. HANDOFF_CC_TO_AG.md (Metadata + Mensaje Consolidado en Canal H)\n` +
          `  3. LOG_FORENSE.md (Entrada de la sesión)`
      );
      process.exit(1);
    }
  });

  logSuccess('Modificación reciente de L, H y F verificada.');
}

interface FileVersions {
  verL: string;
  verH: string;
  verF: string;
}

// 4. Validar consistencia de versiones en los tres archivos
function verifyVersions(
  masterContent: string,
  handoffContent: string,
  forenseContent: string
): FileVersions {
  const masterVerMatch = masterContent.match(/VERSIÓN ACTUAL:\s*(V\.\d+\.\d+\.\d+_\w+)/);
  const handoffVerMatch = handoffContent.match(/Versión activa\s*:\s*(V\.\d+\.\d+\.\d+_\w+)/);
  const forenseVerMatch = forenseContent.match(/###\s*(V\.\d+\.\d+\.\d+)/);

  if (!masterVerMatch) {
    logError('No se encontró el patrón de "VERSIÓN ACTUAL: V.X.Y.Z_Desc" en PROTOCOLO_L.md');
    process.exit(1);
  }
  if (!handoffVerMatch) {
    logError('No se encontró el patrón de "Versión activa  : V.X.Y.Z_Desc" en HANDOFF_CC_TO_AG.md');
    process.exit(1);
  }
  if (!forenseVerMatch) {
    logError('No se encontró el patrón de "### V.X.Y.Z" en LOG_FORENSE.md');
    process.exit(1);
  }

  const verL = masterVerMatch[1];
  const verH = handoffVerMatch[1];
  const verF = forenseVerMatch[1];

  if (verL !== verH || !verL.startsWith(verF)) {
    logError(
      `Inconsistencia de versiones detectada:\n` +
        `  - PROTOCOLO_L.md:  ${verL}\n` +
        `  - HANDOFF_CC_TO_AG.md: ${verH}\n` +
        `  - LOG_FORENSE.md:  ${verF}\n` +
        `Las versiones en L y H deben coincidir exactamente, y la entrada en F debe ser prefijo de estas (ej: V.78.101.157).`
    );
    process.exit(1);
  }

  logSuccess(`Versiones en sincronía: L/H=${verL} · F=${verF}`);
  return { verL, verH, verF };
}

// 5. Validar mensaje y timestamp en Canal H de HANDOFF_CC_TO_AG.md
function verifyCanalH(handoffContent: string, forenseContent: string, verF: string): void {
  const canalHeaderIndex = handoffContent.lastIndexOf('## CANAL DE MENSAJES CC ↔ AG');
  if (canalHeaderIndex === -1) {
    logError('No se encontró la sección "## CANAL DE MENSAJES CC ↔ AG" en HANDOFF_CC_TO_AG.md');
    process.exit(1);
  }

  const canalContent = handoffContent.substring(canalHeaderIndex);
  const msgRegex = /\*\*(\w+)\s*→\s*(\w+)\*\*\s*·\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/g;
  const matches = Array.from(canalContent.matchAll(msgRegex));

  if (matches.length === 0) {
    logError(
      'No se encontró ningún mensaje válido en el canal de comunicación de HANDOFF_CC_TO_AG.md'
    );
    process.exit(1);
  }

  const lastMsgMatch = matches[matches.length - 1];
  const [, emisor, receptor, timestampStr] = lastMsgMatch;
  logWarn(`Último mensaje en canal: **${emisor} → ${receptor}** · ${timestampStr}`);

  // Validar frescura del timestamp del último mensaje (dentro de los últimos 30 minutos)
  const now = Date.now();
  const timeLimit = 30 * 60 * 1000;
  const lastMsgTime = new Date(timestampStr.replace(' ', 'T')).getTime();
  const timeDiff = Math.abs(now - lastMsgTime);

  if (timeDiff > timeLimit) {
    logError(
      `El último mensaje en el canal H (${timestampStr}) tiene más de 30 minutos de antigüedad.\n` +
        `Debes añadir un mensaje consolidado al final de HANDOFF_CC_TO_AG.md con la hora actual del sistema obtenida del shell.`
    );
    process.exit(1);
  }

  // Validar correspondencia con el agente de la bitácora
  const forenseLine = forenseContent.split(/\r?\n/).find((line) => line.startsWith(`### ${verF}`));
  if (forenseLine) {
    const agentMatch = forenseLine.match(/—\s*([A-Za-z]+)\s*$/);
    if (agentMatch) {
      const activeAgent = agentMatch[1].trim();
      if (emisor !== activeAgent) {
        logError(
          `Inconsistencia de emisor: El último mensaje en el Canal H fue enviado por ${emisor}, ` +
            `pero la última entrada en LOG_FORENSE.md indica que la sesión fue realizada por ${activeAgent}.`
        );
        process.exit(1);
      }
    }
  }
}

// 6. Buscar placeholders en el diff de archivos staged (excluyendo tests y scripts)
function verifyNoPlaceholders(): void {
  const diffContent = runCommand('git diff --cached');
  const fileDiffs = diffContent.split('diff --git ');

  const placeholderRegexes = [
    { regex: /rest[o| ]+del\s+c[o|ó]digo/i, name: '"resto del código"' },
    { regex: /rest\s+of\s+the\s+code/i, name: '"rest of the code"' },
    { regex: /placeholder/i, name: '"placeholder"' },
    { regex: /^\+\s*(?:\/\/|\/\*|\*)\s*\.\.\.\s*$/, name: 'línea con comentario de puntos "... "' },
  ];

  fileDiffs.forEach((fileDiff) => {
    if (!fileDiff.trim()) {
      return;
    }

    const lines = fileDiff.split(/\r?\n/);
    const headerLine = lines[0];

    const pathMatch = headerLine.match(/\s+b\/([^\s]+)/);
    if (!pathMatch) {
      return;
    }

    const filePath = pathMatch[1];

    const isCode = filePath.startsWith('apps/') || filePath.startsWith('packages/');
    const isTest =
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('/__tests__/');
    const isTool = filePath.startsWith('scripts/');

    if (!isCode || isTest || isTool) {
      return;
    }

    lines.forEach((line) => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        placeholderRegexes.forEach((p) => {
          if (p.regex.test(line)) {
            logError(
              `Se detectó un marcador de posición (placeholder) prohibido en tu código: ${p.name}\n` +
                `  Archivo: ${filePath}\n` +
                `  Línea: ${line.substring(1).trim()}\n` +
                `Según el Protocolo L §1.2, queda estrictamente prohibido usar placeholders o código incompleto.`
            );
            process.exit(1);
          }
        });
      }
    });
  });
}

function verify(): void {
  console.log('--- VALIDACIÓN DE PROTOCOLO L ---');

  const rootDir = path.join(__dirname, '..');
  const handoffPath = path.join(rootDir, 'Protocolos', 'HANDOFF_CC_TO_AG.md');
  const masterPath = path.join(rootDir, 'Protocolos', 'PROTOCOLO_L.md');
  const forensePath = path.join(rootDir, 'Protocolos', 'LOG_FORENSE.md');

  // 1. Obtener archivos en staged (git diff --cached, excluyendo eliminados)
  const stagedFilesStr = runCommand('git diff --cached --name-only --diff-filter=d');
  if (!stagedFilesStr) {
    logSuccess('No hay archivos staged para commitear. Omitiendo validación.');
    process.exit(0);
  }

  const stagedFiles = stagedFilesStr.split(/\r?\n/).filter(Boolean);

  // Ejecutar validaciones locales
  verifyNoProtocolStaged(stagedFiles);

  // Detectar si hay cambios en código real
  const codeFiles = stagedFiles.filter((file) => {
    const isCode = file.startsWith('apps/') || file.startsWith('packages/');
    const isConfig =
      file.endsWith('.json') || file.endsWith('.config.js') || file.endsWith('.config.ts');
    return isCode && !isConfig;
  });

  if (codeFiles.length === 0) {
    logSuccess(
      'No hay archivos de código staged. Omitiendo validación de modificación de protocolos.'
    );
    process.exit(0);
  }

  logWarn(
    `Archivos de código detectados en commit:\n${codeFiles.slice(0, 5).join('\n')}${
      codeFiles.length > 5 ? '\n... y más' : ''
    }`
  );

  verifyFilesExist(masterPath, handoffPath, forensePath);
  verifyModificationTimes(masterPath, handoffPath, forensePath);

  const masterContent = fs.readFileSync(masterPath, 'utf8');
  const handoffContent = fs.readFileSync(handoffPath, 'utf8');
  const forenseContent = fs.readFileSync(forensePath, 'utf8');

  const { verF } = verifyVersions(masterContent, handoffContent, forenseContent);
  verifyCanalH(handoffContent, forenseContent, verF);
  verifyNoPlaceholders();

  logSuccess('¡Validación de Protocolo L completada con éxito! Commit permitido.');
}

verify();
