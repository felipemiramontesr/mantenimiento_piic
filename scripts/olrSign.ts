/* eslint-disable no-console */
/**
 * FC 068 F1 — Internal_Olr_Signoff_Workflow · Broker de firma OLR.
 * Única vía de escritura para registrar una aprobación O/L/R en el archivo de un FC
 * (protocols/fc/<n>_FC_*.md) — mismo principio de Vía Única que hPost.ts (Regla 8).
 * Firmantes fijos por categoría (§19.2/§20.1 · Holy Trinity L V.6.15.0 / KAE-L 2026-07-12):
 *   O (Operational)     → Alfa | Charlie (basta 1)
 *   L (Law / Legal)     → GrayMan (único — ninguna IA)
 *   R (Review / Audit)  → Bravo (único)
 */
import * as fs from 'fs';
import * as path from 'path';

import { formatTimestamp } from './hPost';

export type OlrFiltro = 'O' | 'L' | 'R';

export const OLR_SIGNERS: Record<OlrFiltro, readonly string[]> = {
  O: ['Alfa', 'Charlie'],
  L: ['GrayMan'],
  R: ['Bravo'],
};

export function isAuthorizedSigner(filtro: OlrFiltro, firmante: string): boolean {
  return OLR_SIGNERS[filtro].includes(firmante);
}

function olrLineRegex(filtro: OlrFiltro): RegExp {
  return new RegExp(`(-\\s*\\[)( |x)(\\]\\s*${filtro}\\s*\\[[^\\]]+\\]\\s*—[^:]*:\\s*).*$`, 'm');
}

export interface ApplyOlrSignatureResult {
  content: string;
  found: boolean;
}

/** Función pura: marca [x] + timestamp en la línea del filtro dado. No toca las otras 2 líneas. */
export function applyOlrSignature(
  fcContent: string,
  filtro: OlrFiltro,
  timestamp: string
): ApplyOlrSignatureResult {
  const regex = olrLineRegex(filtro);
  if (!regex.test(fcContent)) {
    return { content: fcContent, found: false };
  }
  const content = fcContent.replace(regex, `$1x$3${timestamp}`);
  return { content, found: true };
}

/** Localiza el archivo de un FC en protocols/fc/ por número (lookup por prefijo, no hardcodeado). */
export function findFcFile(fcDir: string, fcNumber: string): string | null {
  const padded = fcNumber.padStart(3, '0');
  const files = fs.readdirSync(fcDir).filter((f) => f.startsWith(`${padded}_FC_`));
  return files.length > 0 ? path.join(fcDir, files[0]) : null;
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

interface CliArgs {
  fc?: string;
  filtro?: string;
  firmante?: string;
}

function parseArgs(argv: string[]): CliArgs | null {
  const args: CliArgs = {};
  const flags: Record<string, keyof CliArgs> = {
    '--fc': 'fc',
    '--filtro': 'filtro',
    '--firmante': 'firmante',
  };
  for (let i = 0; i < argv.length; i += 2) {
    const key = flags[argv[i]];
    if (!key || argv[i + 1] === undefined) {
      console.error(`${RED}[olrSign]${RESET} Argumento inválido: ${argv[i]}`);
      return null;
    }
    args[key] = argv[i + 1];
  }
  return args;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args || !args.fc || !args.filtro || !args.firmante) {
    console.error(
      `${YELLOW}Uso:${RESET} bun scripts/olrSign.ts --fc <numero> --filtro <O|L|R> --firmante <nombre>`
    );
    process.exit(2);
  }

  const filtroArg = args.filtro.toUpperCase();
  if (filtroArg !== 'O' && filtroArg !== 'L' && filtroArg !== 'R') {
    console.error(`${RED}[olrSign]${RESET} Filtro inválido: "${args.filtro}". Debe ser O, L o R.`);
    process.exit(1);
  }
  const filtro = filtroArg as OlrFiltro;

  if (!isAuthorizedSigner(filtro, args.firmante)) {
    console.error(
      `${RED}[olrSign]${RESET} Firmante no autorizado para ${filtro}: "${
        args.firmante
      }". Permitidos: ${OLR_SIGNERS[filtro].join(', ')}.`
    );
    process.exit(1);
  }

  const fcDir = path.join(__dirname, '..', 'protocols', 'fc');
  const fcPath = findFcFile(fcDir, args.fc);
  if (!fcPath) {
    console.error(
      `${RED}[olrSign]${RESET} No se encontró ningún FC con número "${args.fc}" en protocols/fc/.`
    );
    process.exit(1);
  }

  const fcContent = fs.readFileSync(fcPath, 'utf8');
  const timestamp = formatTimestamp(new Date());
  const result = applyOlrSignature(fcContent, filtro, timestamp);
  if (!result.found) {
    console.error(
      `${RED}[olrSign]${RESET} No se encontró la línea de aprobación OLR para el filtro ${filtro} en ${path.basename(
        fcPath
      )}.`
    );
    process.exit(1);
  }

  fs.writeFileSync(fcPath, result.content, 'utf8');
  console.log(
    `${GREEN}[OK]${RESET} OLR ${filtro} firmado por ${args.firmante} en ${path.basename(
      fcPath
    )} — ${timestamp}.`
  );
  process.exit(0);
}

const isDirectRun = /olrSign\.(ts|js)$/.test(process.argv[1] ?? '');
if (isDirectRun) {
  main();
}
