import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/testUtils';
import {
  ArchonDataTable,
  ArchonTableHeader,
  deriveMinTableWidth,
  MIN_COL_PX,
} from './ArchonDataTable';

const HEADERS: ArchonTableHeader[] = [{ key: 'name', label: 'NAME', align: 'left' }];

type Row = { name: string };

const renderRow = (r: Row): React.JSX.Element => (
  <tr key={r.name}>
    <td>{r.name}</td>
  </tr>
);

describe('ArchonDataTable', () => {
  it('renders loading state with master variant (default)', () => {
    render(
      <ArchonDataTable<Row>
        data={[]}
        headers={HEADERS}
        loading
        loadingMessage="Cargando datos..."
        renderRow={renderRow}
      />
    );
    expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
  });

  it('renders loading state with embedded variant (covers non-master loadingClasses)', () => {
    render(
      <ArchonDataTable<Row>
        data={[]}
        headers={HEADERS}
        loading
        variant="embedded"
        loadingMessage="Sincronizando..."
        renderRow={renderRow}
      />
    );
    expect(screen.getByText('Sincronizando...')).toBeInTheDocument();
  });

  it('renders empty state when data is empty and not loading', () => {
    render(
      <ArchonDataTable<Row>
        data={[]}
        headers={HEADERS}
        emptyMessage="Sin registros"
        renderRow={renderRow}
      />
    );
    expect(screen.getByText('Sin registros')).toBeInTheDocument();
  });

  it('renders rows when data is provided', () => {
    render(
      <ArchonDataTable<Row>
        data={[{ name: 'Alpha' }, { name: 'Beta' }]}
        headers={HEADERS}
        renderRow={renderRow}
      />
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('getJustifyClass and getAlignClass cover right alignment branches', () => {
    const rightHeaders: ArchonTableHeader[] = [{ key: 'name', label: 'NAME', align: 'right' }];
    const { container } = render(
      <ArchonDataTable<Row>
        data={[{ name: 'Gamma' }]}
        headers={rightHeaders}
        renderRow={renderRow}
      />
    );
    // getAlignClass('right') → 'text-right' on the th
    const th = container.querySelector('th');
    expect(th?.className).toContain('text-right');
    // getJustifyClass('right') → 'justify-end' on the flex div inside th
    const flexDiv = th?.querySelector('div');
    expect(flexDiv?.className).toContain('justify-end');
  });
});

/**
 * FC 078 F1 — contrato responsive (Cond.1 Bravo): minWidth derivado hace
 * imposible el colapso de 078_AN §1 (tabla aplastada al contenedor con
 * encabezados encimados) + integración con SovereignScrollArea.
 */
const W = (widths: (string | undefined)[]): ArchonTableHeader[] =>
  widths.map((width, i) => ({ key: `k${i}`, label: `C${i}`, width }));

describe('deriveMinTableWidth (FC 078 Cond.1 — ×3 casos)', () => {
  it('override explícito minTableWidth gana siempre', () => {
    expect(deriveMinTableWidth(W(['100px', '200px']), 999)).toBe(999);
  });

  it('suma de widths declarados cuando TODOS son px parseables', () => {
    expect(deriveMinTableWidth(W(['100px', '200px', '50px']))).toBe(350);
  });

  it('sin widths o no-px: headers × MIN_COL_PX — jamás NaN', () => {
    expect(deriveMinTableWidth(W([undefined, undefined, undefined]))).toBe(3 * MIN_COL_PX);
    expect(deriveMinTableWidth(W(['10%', '200px']))).toBe(2 * MIN_COL_PX);
    expect(Number.isNaN(deriveMinTableWidth(W(['auto'])))).toBe(false);
  });
});

describe('ArchonDataTable — contrato responsive (FC 078 F1)', () => {
  it('la tabla declara style.minWidth derivado', () => {
    render(
      <ArchonDataTable<Row>
        data={[{ name: 'Alpha' }]}
        headers={W([undefined, undefined])}
        renderRow={renderRow}
      />
    );
    const table = screen.getByTestId('archon-data-table');
    expect(table.style.minWidth).toBe(`${2 * MIN_COL_PX}px`);
    expect(table.className).toContain('table-auto');
  });

  it('con widths declarados conserva table-fixed y suma como minWidth', () => {
    render(
      <ArchonDataTable<Row>
        data={[{ name: 'Alpha' }]}
        headers={W(['120px'])}
        renderRow={renderRow}
        testId="t-fixed"
      />
    );
    const table = screen.getByTestId('t-fixed');
    expect(table.className).toContain('table-fixed');
    expect(table.style.minWidth).toBe('120px');
  });

  it('vive dentro de SovereignScrollArea — affordance heredada por los 10 consumidores', () => {
    render(
      <ArchonDataTable<Row>
        data={[{ name: 'Alpha' }]}
        headers={W([undefined])}
        renderRow={renderRow}
      />
    );
    expect(screen.getByTestId('archon-data-table-scroll')).toBeInTheDocument();
    expect(screen.getByTestId('archon-data-table-scroll-viewport').className).toContain(
      'overflow-x-auto'
    );
  });

  it('minTableWidth override llega al style de la tabla', () => {
    render(
      <ArchonDataTable<Row>
        data={[{ name: 'Alpha' }]}
        headers={W([undefined])}
        renderRow={renderRow}
        testId="t-ovr"
        minTableWidth={777}
      />
    );
    expect(screen.getByTestId('t-ovr').style.minWidth).toBe('777px');
  });
});
