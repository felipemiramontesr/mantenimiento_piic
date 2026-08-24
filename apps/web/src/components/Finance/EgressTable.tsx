import React from 'react';
import { FinancialTransaction, FinanceCategory } from '../../types/finance';
import EgressRegistrationModal from './EgressRegistrationModal';
import ArchonDataTable from '../UI/ArchonDataTable';
import { useEgressTableState } from './EgressTable/useEgressTableState';
import { EgressToolbar } from './EgressTable/EgressToolbar';
import { EgressTableRow } from './EgressTable/EgressTableRow';
import { LoadMoreButton } from './EgressTable/LoadMoreButton';
import { HEADERS } from './EgressTable/constants';

interface EgressTableProps {
  from: string;
  to: string;
  initialCategory?: FinanceCategory | '';
}

const EgressTable: React.FC<EgressTableProps> = ({
  from,
  to,
  initialCategory = '',
}): React.ReactElement => {
  const state = useEgressTableState(from, to, initialCategory);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <EgressToolbar
        searchRef={state.searchRef}
        unitSearch={state.unitSearch}
        onUnitSearchChange={state.onUnitSearchChange}
        onOpenSearch={state.openSearch}
        onCloseSearchOnEscape={state.closeSearch}
        onClearUnit={state.clearUnit}
        searchOpen={state.searchOpen}
        suggestions={state.suggestions}
        onSelectUnit={state.selectUnit}
        categoryFilter={state.categoryFilter}
        onCategoryChange={state.setCategoryFilter}
        total={state.total}
        onExport={state.handleExport}
        exporting={state.exporting}
        onRegister={state.openModal}
      />

      {/* FC 078 F3 — tabla migrada a la primitiva ArchonDataTable (SSOT
          responsive: minWidth real + SovereignScrollArea). Misma data,
          mismo orden de columnas que la tabla artesanal que sustituye. */}
      <div className="bg-white border border-pinnacle-navy/5 rounded-[4px] shadow-pinnacle overflow-hidden">
        <ArchonDataTable<FinancialTransaction>
          data={state.rows}
          headers={HEADERS}
          loading={state.loading}
          loadingMessage="Cargando..."
          emptyMessage="Sin egresos registrados en este período"
          testId="egress-table"
          variant="embedded"
          renderRow={(row): React.ReactNode => <EgressTableRow row={row} />}
        />
      </div>

      {state.nextCursor && <LoadMoreButton onClick={state.loadMore} loading={state.loadingMore} />}

      {state.showModal && (
        <EgressRegistrationModal
          onClose={state.closeModal}
          onSuccess={state.handleTransactionCreated}
        />
      )}
    </div>
  );
};

export default EgressTable;
