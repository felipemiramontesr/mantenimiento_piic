import React, { useState } from 'react';
import { Undo2 } from 'lucide-react';
import { ManualBlock, revokeBlock } from './securityEventsApi';
import { formatUtc } from './SecurityEventsTable';

interface ActiveBlocksListProps {
  readonly blocks: ManualBlock[];
  readonly onRevoked: () => void;
}

/** FC201 F3 (P4) — bloqueos vigentes con revocación inmediata. */
export default function ActiveBlocksList({
  blocks,
  onRevoked,
}: ActiveBlocksListProps): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);

  const revoke = (ipHash: string): void => {
    setError(null);
    revokeBlock(ipHash)
      .then(onRevoked)
      .catch(() => setError('No se pudo revocar el bloqueo. Intenta de nuevo.'));
  };

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-pinnacle-navy/40" data-testid="active-blocks-empty">
        No hay IPs bloqueadas.
      </p>
    );
  }
  return (
    <div className="space-y-2" data-testid="active-blocks">
      {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
      {blocks.map((block) => (
        <div
          key={block.ipHash}
          className="flex items-center justify-between gap-4 border border-slate-100 rounded-[4px] px-4 py-2 text-xs"
          data-testid="active-block-row"
        >
          <span className="font-mono text-pinnacle-navy">{block.ipAddress ?? 'Seudonimizada'}</span>
          <span className="flex-1 text-pinnacle-navy/60 truncate">{block.reason ?? '—'}</span>
          <span className="text-pinnacle-navy/60">Vence {formatUtc(block.expiresUtc)}</span>
          <button
            type="button"
            onClick={(): void => revoke(block.ipHash)}
            className="inline-flex items-center gap-1 text-pinnacle-navy/70 hover:text-pinnacle-navy font-bold uppercase tracking-widest"
          >
            <Undo2 size={12} /> Revocar
          </button>
        </div>
      ))}
    </div>
  );
}
