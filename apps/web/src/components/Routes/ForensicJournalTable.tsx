import React from 'react';
import { Shield } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { ForensicJournalTableProps } from './ForensicJournalTable/types';
import useForensicLogs from './ForensicJournalTable/useForensicLogs';
import JournalBody from './ForensicJournalTable/JournalBody';

/**
 * 🔱 ARCHON FORENSIC JOURNAL TABLE
 * Purpose: Immutable trace of all asset impacts and telemetery deltas.
 * Version: 1.2.0 - Full-Width Symmetry Standard
 * v.1.3.0 (FC165 F3 Slice3.1 Batch4): split en `ForensicJournalTable/`
 * (Dual-Gate Isolation, Gate2 max-lines-per-function:50).
 */
const ForensicJournalTable: React.FC<ForensicJournalTableProps> = ({
  unitId,
  routeUuid,
  hideHeader,
}) => {
  const { units } = useFleet();
  const { logs, loading, sessionEvidence } = useForensicLogs(unitId, routeUuid);

  return (
    <div
      className={`animate-in fade-in duration-700 w-full !p-0 !m-0 ${unitId ? '' : 'space-y-6'}`}
    >
      {!hideHeader && !unitId && (
        <div className="flex items-center gap-3 px-6 py-4 bg-white/50 rounded-[4px] border border-pinnacle-navy/5 mx-8">
          <Shield className="text-amber-500" size={24} />
          <div>
            <h2 className="text-lg font-black text-pinnacle-navy uppercase tracking-tighter leading-none">
              Journal de Activos
            </h2>
            <p className="text-archon-base font-bold text-pinnacle-navy opacity-40 uppercase tracking-widest">
              Rastro Inmutable de Operaciones y Desgaste
            </p>
          </div>
        </div>
      )}

      <div className={unitId ? '!w-full !px-0' : 'mx-8'}>
        <JournalBody
          unitId={unitId}
          routeUuid={routeUuid}
          logs={logs}
          loading={loading}
          units={units}
          sessionEvidence={sessionEvidence}
        />
      </div>
    </div>
  );
};

export default ForensicJournalTable;
