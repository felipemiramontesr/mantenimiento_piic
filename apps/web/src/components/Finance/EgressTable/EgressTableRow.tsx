import React from 'react';
import { FinancialTransaction, CATEGORY_LABELS } from '../../../types/finance';
import { formatMXN, formatDate, cleanConcept } from './formatters';
import { CATEGORY_BADGE } from './constants';

interface ConceptCellProps {
  row: FinancialTransaction;
}

/** Celda de concepto (con referencia de factura para filas manuales) (FC163 F1B-3, split Alfa 219_AN — sub-split de EgressTableRow). */
function ConceptCell({ row }: ConceptCellProps): React.JSX.Element {
  if (row.source === 'AUTO') {
    return (
      <span className="text-archon-md text-pinnacle-navy/60 italic" title={cleanConcept(row)}>
        {cleanConcept(row)}
      </span>
    );
  }
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-archon-md font-bold text-pinnacle-navy" title={cleanConcept(row)}>
        {cleanConcept(row)}
      </span>
      {row.invoice_ref && (
        <span className="text-archon-sm font-mono text-pinnacle-navy/40">{row.invoice_ref}</span>
      )}
    </div>
  );
}

export interface EgressTableRowProps {
  row: FinancialTransaction;
}

/** Fila de la tabla de egresos (FC163 F1B-3, split Alfa 219_AN). */
export function EgressTableRow({ row }: EgressTableRowProps): React.JSX.Element {
  return (
    <tr
      key={row.uuid}
      className="border-y border-slate-200/50 bg-transparent hover:bg-slate-50/50 transition-all duration-300"
    >
      <td className="text-center py-4 px-4 font-mono font-black text-archon-label text-pinnacle-navy whitespace-nowrap">
        {row.unit_name}
      </td>
      <td className="text-center py-4 px-4">
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-[4px] text-archon-sm font-black uppercase tracking-widest ${
              CATEGORY_BADGE[row.category] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            {CATEGORY_LABELS[row.category] ?? row.category}
          </span>
        </div>
      </td>
      <td className="text-center py-4 px-4 font-mono font-black text-archon-lg text-pinnacle-navy whitespace-nowrap">
        {formatMXN(row.amount)}
      </td>
      <td className="text-center py-4 px-4">
        <ConceptCell row={row} />
      </td>
      <td className="text-center py-4 px-4">
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-[4px] text-archon-sm font-black uppercase tracking-widest ${
              row.source === 'AUTO' ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {row.source === 'AUTO' ? 'Sistema' : 'Manual'}
          </span>
        </div>
      </td>
      <td className="text-center py-4 px-4 text-archon-md font-bold text-pinnacle-navy/60 whitespace-nowrap">
        {formatDate(row.created_at)}
      </td>
    </tr>
  );
}
