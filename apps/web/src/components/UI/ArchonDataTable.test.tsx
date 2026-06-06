import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/testUtils';
import { ArchonDataTable, ArchonTableHeader } from './ArchonDataTable';

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
