/**
 * Archon Typography System — Single source of truth for table/cell text patterns.
 * Import AT in any component to apply consistent Tailwind class combinations.
 * All strings are static literals so Tailwind JIT detects them at build time.
 */

const AT = {
  // ── Cell values ──────────────────────────────────────────────────────────
  cellValue: 'text-archon-md font-black text-[#0f2a44]',
  cellMono: 'font-mono text-archon-md font-black',
  cellMeta: 'text-archon-sm font-bold text-slate-400 uppercase mt-1',
  cellLabel: 'text-archon-base font-black uppercase tracking-[0.15em]',
  cellValueMuted: 'text-archon-md font-black text-slate-300',
  cellSubtle: 'text-archon-sm font-black text-[#0f2a44] uppercase',
  cellDetail: 'text-archon-md text-[#0f2a44]/70 leading-snug',

  // ── Badges ───────────────────────────────────────────────────────────────
  idBadge:
    'text-archon-xs font-black text-white bg-[#0f2a44] px-1.5 py-0.5 rounded-[3px] tracking-wider uppercase shadow-sm',
  statusBadge:
    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-archon-base font-black border',
  severityBadge:
    'inline-flex items-center gap-1.5 text-archon-xs font-black uppercase tracking-widest px-2 py-1 rounded-[3px]',

  // ── Panel headers ─────────────────────────────────────────────────────────
  sectionTitle: 'text-archon-base font-black uppercase tracking-[0.2em] text-[#0f2a44]/50',
  sectionDescription: 'text-archon-sm font-bold uppercase tracking-[0.2em] text-[#0f2a44]/20',
} as const;

export default AT;
