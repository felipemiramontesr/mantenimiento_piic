import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import SnapshotDiff from './SnapshotDiff';
import { AuditRow, ACTION_BADGE, ACTION_LABEL } from './types';

interface AuditRowMainProps {
  row: AuditRow;
  omnipotent: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

/** Fila principal (colapsada) de un registro de auditoría (FC163 F2B4 Sub-Batch 4B-2). */
function AuditRowMain({
  row,
  omnipotent,
  isExpanded,
  onToggle,
}: AuditRowMainProps): React.ReactElement {
  const date = new Date(row.created_at).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  return (
    <tr
      data-testid={`audit-row-${row.uuid}`}
      onClick={onToggle}
      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors text-xs text-pinnacle-navy"
    >
      <td className="px-3 py-2 text-pinnacle-navy/30">
        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-pinnacle-navy/60">{date}</td>
      {omnipotent && (
        <td className="px-3 py-2 text-pinnacle-navy/70">{row.universe_label ?? '—'}</td>
      )}
      <td className="px-3 py-2">
        <span className="font-bold">{row.actor_username ?? '—'}</span>
      </td>
      <td className="px-3 py-2">
        <span className="text-pinnacle-navy/50">{row.entity_type}/</span>
        <span className="font-bold">{row.entity_id}</span>
      </td>
      <td className="px-3 py-2">
        <span
          className={`inline-flex px-2 py-0.5 rounded-[3px] font-black text-[10px] uppercase tracking-widest ${
            ACTION_BADGE[row.action] ?? ''
          }`}
        >
          {ACTION_LABEL[row.action] ?? row.action}
        </span>
      </td>
      {/* P2-2 — celda truncable expone title (tooltip nativo) */}
      <td className="px-3 py-2 text-pinnacle-navy/60 max-w-[200px] truncate" title={row.reason}>
        {row.reason}
      </td>
    </tr>
  );
}

interface AuditRowDiffProps {
  row: AuditRow;
  omnipotent: boolean;
  onlyDiffs: boolean;
  onToggleOnlyDiffs: () => void;
}

/** Fila expandida con el diff de snapshot antes/después (FC163 F2B4 Sub-Batch 4B-2). */
function AuditRowDiff({
  row,
  omnipotent,
  onlyDiffs,
  onToggleOnlyDiffs,
}: AuditRowDiffProps): React.ReactElement {
  return (
    <tr data-testid={`audit-diff-${row.uuid}`}>
      <td colSpan={omnipotent ? 7 : 6} className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-pinnacle-navy/40">
            Diff de Cambios
          </span>
          <button
            type="button"
            onClick={(e): void => {
              e.stopPropagation();
              onToggleOnlyDiffs();
            }}
            className="text-[10px] font-black uppercase tracking-widest text-pinnacle-yellow underline"
            data-testid="toggle-only-diffs"
          >
            {onlyDiffs ? 'Mostrar todo' : 'Solo diferencias'}
          </button>
        </div>
        <SnapshotDiff
          before={row.snapshot_before}
          after={row.snapshot_after}
          onlyDiffs={onlyDiffs}
        />
      </td>
    </tr>
  );
}

interface AuditLogItemRowProps {
  row: AuditRow;
  omnipotent: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onlyDiffs: boolean;
  onToggleOnlyDiffs: () => void;
}

/** Fila de tabla (colapsada + diff expandible) de un registro de auditoría (FC163 F2B4 Sub-Batch 4B-2). */
function AuditLogItemRow({
  row,
  omnipotent,
  isExpanded,
  onToggleExpand,
  onlyDiffs,
  onToggleOnlyDiffs,
}: AuditLogItemRowProps): React.ReactElement {
  return (
    <React.Fragment>
      <AuditRowMain
        row={row}
        omnipotent={omnipotent}
        isExpanded={isExpanded}
        onToggle={onToggleExpand}
      />
      {isExpanded && (
        <AuditRowDiff
          row={row}
          omnipotent={omnipotent}
          onlyDiffs={onlyDiffs}
          onToggleOnlyDiffs={onToggleOnlyDiffs}
        />
      )}
    </React.Fragment>
  );
}

export default AuditLogItemRow;
