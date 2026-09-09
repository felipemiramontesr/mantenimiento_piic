import React from 'react';
import { ArrowRight } from 'lucide-react';

// 🛡️ ARCHON WHITELIST: Only show business-relevant fields that ARE NOT
// already represented by the specialized icon rows above.
const WHITELIST: Record<string, string> = {
  destination: 'Destino',
  status: 'Estado',
  additives_check: 'Aditivos',
};

// FC165 F3 Slice3.1 Batch4 — purga: el whitelist de arriba es un dominio
// cerrado de 3 claves, ninguna de las cuales es numérica (los campos de
// monto/lectura/nivel YA se muestran vía las filas con ícono especializado
// del renderRow, por diseño — ver comentario ARCHON WHITELIST). El
// prefijo/sufijo de unidades dinámicas ('amount'→'$', 'reading'→' KM',
// 'level'→' %', 'fuel_liters_loaded'→' L') y el `minimumFractionDigits`
// diferenciado por 'amount' que existían aquí estaban permanentemente
// inalcanzables (censo vivo, confirmado también en L §FC165 desde Slice
// 2.1C) — purgados junto con `formatVal`'s branch de 'amount'.

/** `v` es `unknown` a nivel de firma (datos de snapshot JSON arbitrarios),
 * pero el WHITELIST de arriba es un dominio cerrado de 3 claves no
 * numéricas — en la práctica `v` siempre es string aquí. Se preserva una
 * representación real si algún día llega un objeto (S6551). Extraída a
 * función nombrada (mismo patrón que `alerts.calculators.ts`'s
 * `stringifyRaw`). */
function stringifyRaw(v: unknown): string {
  return typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
}

function formatVal(v: unknown, k: string): string {
  if (v === null || v === undefined) return '—';
  if (k === 'additives_check') return v ? 'SI' : 'NO';
  if (!Number.isNaN(Number(v))) {
    return Number(v).toLocaleString(undefined, { minimumFractionDigits: 1 });
  }
  return stringifyRaw(v);
}

/** Parsea `snapshot_before`/`snapshot_after` (JSON o ya-objeto) de forma
 * segura; `null` si faltan o si el parseo falla. */
function safeParseSnapshots(
  rawBefore: unknown,
  rawAfter: unknown
): { before: Record<string, unknown>; after: Record<string, unknown> } | null {
  if (!rawBefore || !rawAfter) return null;
  try {
    const before =
      typeof rawBefore === 'string'
        ? JSON.parse(rawBefore)
        : (rawBefore as Record<string, unknown>);
    const after =
      typeof rawAfter === 'string' ? JSON.parse(rawAfter) : (rawAfter as Record<string, unknown>);
    return { before, after };
  } catch {
    return null;
  }
}

function resolveWhitelistedChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  return Object.keys(after).filter((key) => {
    if (!WHITELIST[key]) return false;
    const vB = before[key];
    const vA = after[key];
    return vB !== vA && !(vB === null && vA === null);
  });
}

export interface UniversalDeltaEngineProps {
  readonly snapshotBefore: unknown;
  readonly snapshotAfter: unknown;
}

/** 🔱 UNIVERSAL DELTA ENGINE (Snapshot Comparison) — compara los snapshots
 * before/after de un log y renderiza los cambios en los campos del
 * whitelist. Extraído de `ForensicJournalTable`'s `renderRow` para
 * mantenerlo bajo el presupuesto de Gate2 (FC165 F3 Slice3.1 Batch4,
 * Dual-Gate Isolation). */
export default function UniversalDeltaEngine({
  snapshotBefore,
  snapshotAfter,
}: UniversalDeltaEngineProps): React.ReactNode {
  const parsed = safeParseSnapshots(snapshotBefore, snapshotAfter);
  if (!parsed) return null;
  const { before, after } = parsed;

  const whitelistedChanges = resolveWhitelistedChanges(before, after);
  if (whitelistedChanges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
      {whitelistedChanges.map((key) => (
        <div
          key={key}
          className="flex items-center gap-1.5 bg-pinnacle-navy/[0.03] border border-pinnacle-navy/5 px-2 py-0.5 rounded-[4px]"
        >
          <span className="text-archon-xs font-black text-pinnacle-navy opacity-40 uppercase">
            {WHITELIST[key]}:
          </span>
          <span className="text-archon-sm font-bold text-pinnacle-navy opacity-50 line-through">
            {formatVal(before[key], key)}
          </span>
          <ArrowRight size={8} className="opacity-20" />
          <span className="text-archon-sm font-black text-blue-600">
            {formatVal(after[key], key)}
          </span>
        </div>
      ))}
    </div>
  );
}
