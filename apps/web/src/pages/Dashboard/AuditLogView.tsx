import React, { useState } from 'react';
import usePermissions from '../../hooks/usePermissions';
import { useAuditLogData } from './AuditLogView/useAuditLogData';
import AuditFilterBar from './AuditLogView/AuditFilterBar';
import AuditLogTable from './AuditLogView/AuditLogTable';
import AuditPagination from './AuditLogView/AuditPagination';
import { AuditLogLoading, AuditLogError, AuditLogEmpty } from './AuditLogView/AuditLogStatusViews';

/** Vista del historial de auditoría: filtros, tabla expandible y paginación (FC163 F2B4 Sub-Batch 4B-2). */
const AuditLogView: React.FC = (): React.ReactElement => {
  const { isOmnipotent } = usePermissions();
  const omnipotent = isOmnipotent();
  const {
    rows,
    meta,
    filters,
    setFilters,
    page,
    setPage,
    loading,
    error,
    handleApply,
    totalPages,
  } = useAuditLogData();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [onlyDiffs, setOnlyDiffs] = useState(false);

  if (loading) return <AuditLogLoading />;
  if (error) return <AuditLogError />;

  return (
    <div data-testid="audit-log-view" className="space-y-4">
      <AuditFilterBar filters={filters} setFilters={setFilters} onApply={handleApply} />
      {rows.length === 0 ? (
        <AuditLogEmpty />
      ) : (
        <>
          {/* FC 078 F3 — tabla migrada a la primitiva ArchonDataTable (SSOT
              responsive). Misma data, mismo orden; la fila expandible viaja
              como Fragment (tr principal + tr de diff) desde renderRow. */}
          <AuditLogTable
            rows={rows}
            omnipotent={omnipotent}
            expandedRow={expandedRow}
            setExpandedRow={setExpandedRow}
            onlyDiffs={onlyDiffs}
            setOnlyDiffs={setOnlyDiffs}
          />
          <AuditPagination meta={meta} page={page} setPage={setPage} totalPages={totalPages} />
        </>
      )}
    </div>
  );
};

export default AuditLogView;
