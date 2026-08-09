import React from 'react';
import { formatKm } from '../nodes/NodeShared';

/** Renders remaining km until next service, flagged red when overdue. */
export function KmRemainingValue({
  kmRemaining,
}: {
  kmRemaining: number | null;
}): React.JSX.Element {
  if (kmRemaining == null) return <span>—</span>;
  const overdue = kmRemaining < 0;
  return (
    <span className={overdue ? 'text-red-600 font-black' : ''}>
      {formatKm(Math.abs(kmRemaining))}
      {overdue ? ' (vencido)' : ''}
    </span>
  );
}

export default KmRemainingValue;
