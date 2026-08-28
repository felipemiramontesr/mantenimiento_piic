import React from 'react';

interface SnapshotDiffProps {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  onlyDiffs: boolean;
}

/** Comparación lado a lado (antes/después) de un snapshot de auditoría (FC163 F2B4 Sub-Batch 4B-2). */
function SnapshotDiff({ before, after, onlyDiffs }: SnapshotDiffProps): React.ReactElement {
  const allKeys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));

  const visibleKeys = onlyDiffs
    ? allKeys.filter((k) => JSON.stringify((before ?? {})[k]) !== JSON.stringify((after ?? {})[k]))
    : allKeys;

  if (visibleKeys.length === 0) {
    return (
      <p className="text-xs text-pinnacle-navy/40 italic">
        {onlyDiffs ? 'Sin diferencias detectadas.' : 'Sin datos de snapshot.'}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
      <div className="text-pinnacle-navy/40 font-black uppercase tracking-widest text-[10px] col-span-2 grid grid-cols-2">
        <span>Antes</span>
        <span>Después</span>
      </div>
      {visibleKeys.map((key) => {
        const bVal = JSON.stringify((before ?? {})[key] ?? null);
        const aVal = JSON.stringify((after ?? {})[key] ?? null);
        const changed = bVal !== aVal;
        return (
          <React.Fragment key={key}>
            <div
              className={`rounded-[2px] px-2 py-1 ${
                changed ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-pinnacle-navy/60'
              }`}
            >
              <span className="opacity-50">{key}: </span>
              {bVal}
            </div>
            <div
              className={`rounded-[2px] px-2 py-1 ${
                changed ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-pinnacle-navy/60'
              }`}
            >
              <span className="opacity-50">{key}: </span>
              {aVal}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default SnapshotDiff;
