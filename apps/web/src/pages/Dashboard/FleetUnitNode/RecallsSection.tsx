import React, { useCallback, useState } from 'react';
import { Bell, Globe, Plus, CheckCircle, XCircle } from 'lucide-react';
import AT from '../../../styles/archonTypography';
import ArchonDataTable, { ArchonTableHeader } from '../../../components/UI/ArchonDataTable';
import { useFleetRecalls, RecallStatus, RecallItem } from '../../../hooks/useFleetRecalls';
import { SectionCard, formatDate } from '../nodes/NodeShared';
import { RecallLinkModal } from './RecallLinkModal';
import { NhtsaResultsModal } from './NhtsaResultsModal';

const RECALL_STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border border-amber-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  NOT_APPLICABLE: 'bg-slate-100 text-slate-500 border border-slate-200',
};

const RECALL_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completado',
  NOT_APPLICABLE: 'No aplica',
};

const RECALL_HEADERS: ArchonTableHeader[] = [
  { key: 'code', label: 'Campaña', align: 'center', width: '14%' },
  { key: 'desc', label: 'Descripción', align: 'center', width: '34%' },
  { key: 'date', label: 'Publicación', align: 'center', width: '14%' },
  { key: 'status', label: 'Estado', align: 'center', width: '16%' },
  { key: 'actions', label: 'ACCIONES', align: 'center', width: '22%' },
];

type RecallsSectionProps = {
  unitId: string;
  make: string;
  model: string;
  year: number;
};

function RecallsToolbar({
  onSearchClick,
  onLinkClick,
}: {
  onSearchClick(): void;
  onLinkClick(): void;
}): React.JSX.Element {
  return (
    <div className="flex justify-end mb-3 gap-2">
      <button
        title="Buscar recalls en NHTSA"
        onClick={onSearchClick}
        className="flex items-center justify-center w-10 h-10 text-slate-600 bg-slate-50 hover:bg-slate-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
      >
        <Globe size={18} />
      </button>
      <button
        title="Vincular recall del catálogo"
        onClick={onLinkClick}
        className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

function RecallRowActions({
  r,
  onComplete,
  onNotApplicable,
}: {
  r: RecallItem;
  onComplete(recallId: number): void;
  onNotApplicable(recallId: number): void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-center gap-2">
      {r.status !== 'COMPLETED' && (
        <button
          title="Marcar como completado"
          onClick={(): void => onComplete(r.recall_id)}
          className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
        >
          <CheckCircle size={18} />
        </button>
      )}
      {r.status === 'PENDING' && (
        <button
          title="Marcar como no aplica"
          onClick={(): void => onNotApplicable(r.recall_id)}
          className="flex items-center justify-center w-10 h-10 text-slate-500 bg-slate-50 hover:bg-slate-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
        >
          <XCircle size={18} />
        </button>
      )}
    </div>
  );
}

function RecallRow({
  r,
  onComplete,
  onNotApplicable,
}: {
  r: RecallItem;
  onComplete(recallId: number): void;
  onNotApplicable(recallId: number): void;
}): React.ReactElement {
  return (
    <tr key={r.recall_id} className="hover:bg-slate-50/70 transition-colors">
      <td className="px-3 py-3 text-center">
        <span className={AT.cellMono}>{r.campaign_code}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={AT.cellValue}>{r.description}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={AT.cellMono}>{formatDate(r.published_date)}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span
          className={`text-archon-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] ${
            RECALL_STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-500'
          }`}
        >
          {RECALL_STATUS_LABEL[r.status] ?? r.status}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <RecallRowActions r={r} onComplete={onComplete} onNotApplicable={onNotApplicable} />
      </td>
    </tr>
  );
}

function RecallModals({
  modalOpen,
  nhtsaModalOpen,
  make,
  model,
  year,
  linkRecall,
  refresh,
  onCloseLink,
  onCloseNhtsa,
}: {
  modalOpen: boolean;
  nhtsaModalOpen: boolean;
  make: string;
  model: string;
  year: number;
  linkRecall(recallId: number): Promise<void>;
  refresh(): void;
  onCloseLink(): void;
  onCloseNhtsa(): void;
}): React.JSX.Element {
  return (
    <>
      <RecallLinkModal isOpen={modalOpen} onClose={onCloseLink} onConfirm={linkRecall} />
      <NhtsaResultsModal
        isOpen={nhtsaModalOpen}
        make={make}
        model={model}
        year={year}
        onClose={onCloseNhtsa}
        onImported={refresh}
        linkRecall={linkRecall}
      />
    </>
  );
}

function useRecallStatusHandlers(
  updateStatus: (recallId: number, status: RecallStatus) => Promise<void>,
  refresh: () => void
): { handleComplete(recallId: number): void; handleNotApplicable(recallId: number): void } {
  const handleComplete = useCallback(
    (recallId: number): void => {
      updateStatus(recallId, 'COMPLETED' as RecallStatus).catch(refresh);
    },
    [updateStatus, refresh]
  );
  const handleNotApplicable = useCallback(
    (recallId: number): void => {
      updateStatus(recallId, 'NOT_APPLICABLE' as RecallStatus).catch(refresh);
    },
    [updateStatus, refresh]
  );
  return { handleComplete, handleNotApplicable };
}

function RecallsTable({
  recalls,
  loading,
  onComplete,
  onNotApplicable,
}: {
  recalls: RecallItem[];
  loading: boolean;
  onComplete(recallId: number): void;
  onNotApplicable(recallId: number): void;
}): React.JSX.Element {
  return (
    <ArchonDataTable
      data={recalls}
      headers={RECALL_HEADERS}
      variant="embedded"
      emptyMessage="Sin recalls registrados para esta unidad"
      loading={loading}
      renderRow={(r): React.ReactElement => (
        <RecallRow
          key={r.recall_id}
          r={r}
          onComplete={onComplete}
          onNotApplicable={onNotApplicable}
        />
      )}
    />
  );
}

/** Recalls card: table + link/search-NHTSA actions for a fleet unit. */
export function RecallsSection({
  unitId,
  make,
  model,
  year,
}: RecallsSectionProps): React.JSX.Element {
  const { recalls, loading, refresh, linkRecall, updateStatus } = useFleetRecalls(unitId);
  const [modalOpen, setModalOpen] = useState(false);
  const [nhtsaModalOpen, setNhtsaModalOpen] = useState(false);
  const { handleComplete, handleNotApplicable } = useRecallStatusHandlers(updateStatus, refresh);

  return (
    <>
      <RecallModals
        modalOpen={modalOpen}
        nhtsaModalOpen={nhtsaModalOpen}
        make={make}
        model={model}
        year={year}
        linkRecall={linkRecall}
        refresh={refresh}
        onCloseLink={(): void => setModalOpen(false)}
        onCloseNhtsa={(): void => setNhtsaModalOpen(false)}
      />
      <SectionCard title="Recalls" icon={<Bell size={16} className="text-[#f2b705]" />}>
        <RecallsToolbar
          onSearchClick={(): void => setNhtsaModalOpen(true)}
          onLinkClick={(): void => setModalOpen(true)}
        />
        <RecallsTable
          recalls={recalls}
          loading={loading}
          onComplete={handleComplete}
          onNotApplicable={handleNotApplicable}
        />
      </SectionCard>
    </>
  );
}

export default RecallsSection;
