import React from 'react';
import ArchonDataTable, { ArchonTableHeader } from '../../../components/UI/ArchonDataTable';
import AuditLogItemRow from './AuditLogItemRow';
import { AuditRow } from './types';

function buildAuditHeaders(omnipotent: boolean): ArchonTableHeader[] {
  return [
    { key: 'expand', label: '', align: 'left', width: '32px' },
    { key: 'fecha', label: 'Fecha', align: 'left' },
    ...(omnipotent
      ? [
          {
            key: 'universo',
            label: <span data-testid="col-universo">Universo</span>,
            align: 'left',
          } as ArchonTableHeader,
        ]
      : []),
    { key: 'actor', label: 'Actor', align: 'left' },
    { key: 'entidad', label: 'Entidad', align: 'left' },
    { key: 'accion', label: 'Acción', align: 'left' },
    { key: 'razon', label: 'Razón', align: 'left' },
  ];
}

interface AuditLogTableProps {
  rows: AuditRow[];
  omnipotent: boolean;
  expandedRow: string | null;
  setExpandedRow: React.Dispatch<React.SetStateAction<string | null>>;
  onlyDiffs: boolean;
  setOnlyDiffs: React.Dispatch<React.SetStateAction<boolean>>;
}

/** Tabla de auditoría (ArchonDataTable) con filas expandibles de diff (FC163 F2B4 Sub-Batch 4B-2). */
function AuditLogTable({
  rows,
  omnipotent,
  expandedRow,
  setExpandedRow,
  onlyDiffs,
  setOnlyDiffs,
}: AuditLogTableProps): React.ReactElement {
  return (
    <div className="rounded-[4px] border border-slate-200 overflow-hidden">
      <ArchonDataTable<AuditRow>
        data={rows}
        headers={buildAuditHeaders(omnipotent)}
        testId="audit-log-table"
        variant="embedded"
        emptyMessage="Sin registros de auditoría"
        renderRow={(row): React.ReactNode => (
          <AuditLogItemRow
            key={row.uuid}
            row={row}
            omnipotent={omnipotent}
            isExpanded={expandedRow === row.uuid}
            onToggleExpand={(): void => setExpandedRow(expandedRow === row.uuid ? null : row.uuid)}
            onlyDiffs={onlyDiffs}
            onToggleOnlyDiffs={(): void => setOnlyDiffs((v) => !v)}
          />
        )}
      />
    </div>
  );
}

export default AuditLogTable;
