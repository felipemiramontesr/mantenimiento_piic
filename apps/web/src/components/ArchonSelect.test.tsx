import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ArchonSelect from './ArchonSelect';

/**
 * 🔱 Archon QA: ArchonSelect (Intelligent Combobox) Unit Test
 * Purpose: Validation of Fuzzy Search, Secondary Labels, and scaled fleet interactions.
 */

describe('ArchonSelect', () => {
  const options = [
    { value: 'ASM-01', label: 'ASM-01', secondaryLabel: 'TOYOTA HILUX', searchTerms: 'Zacatecas' },
    { value: 'ASM-02', label: 'ASM-02', secondaryLabel: 'NISSAN NP300', searchTerms: 'Planta' },
    { value: 'ASM-10', label: 'ASM-10', secondaryLabel: 'RAM 4000', searchTerms: 'Logística' },
  ];

  const mockOnChange = vi.fn();

  it('renders placeholder when no value is selected', () => {
    render(
      <ArchonSelect
        options={options}
        value=""
        onChange={mockOnChange}
        placeholder="Seleccionar Unidad"
      />
    );
    expect(screen.getByText('Seleccionar Unidad')).toBeInTheDocument();
  });

  it('opens dropdown and displays options with secondary labels', () => {
    render(<ArchonSelect options={options} value="" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Seleccionar...'));

    expect(screen.getByText('ASM-01')).toBeInTheDocument();
    expect(screen.getByText('TOYOTA HILUX')).toBeInTheDocument();
  });

  it('filters options based on search input (Fuzzy Search)', async () => {
    render(<ArchonSelect options={options} value="" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Seleccionar...'));

    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(searchInput, { target: { value: 'NP300' } });

    await waitFor(() => {
      expect(screen.queryByText('ASM-01')).not.toBeInTheDocument();
      expect(screen.getByText('ASM-02')).toBeInTheDocument();
    });
  });

  it('filters by searchTerms field', async () => {
    render(<ArchonSelect options={options} value="" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Seleccionar...'));

    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(searchInput, { target: { value: 'Logística' } });

    await waitFor(() => {
      expect(screen.getByText('ASM-10')).toBeInTheDocument();
    });
  });

  it('calls onChange and closes when an option is clicked', async () => {
    render(<ArchonSelect options={options} value="" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Seleccionar...'));
    fireEvent.click(screen.getByText('ASM-01'));

    expect(mockOnChange).toHaveBeenCalledWith('ASM-01');
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Buscar...')).not.toBeInTheDocument();
    });
  });

  it('displays empty state message when no matches found', async () => {
    render(<ArchonSelect options={options} value="" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Seleccionar...'));

    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(searchInput, { target: { value: 'X-WING' } });

    await waitFor(() => {
      expect(screen.getByText(/No se encontraron coincidencias/i)).toBeInTheDocument();
    });
  });

  it('renders disabled state with opacity class', () => {
    render(<ArchonSelect options={options} value="" onChange={mockOnChange} disabled={true} />);
    const trigger = screen.getByText('Seleccionar...').closest('[class*="opacity-40"]');
    expect(trigger).toBeTruthy();
  });

  it('clears search term when clicking the X button', async () => {
    render(<ArchonSelect options={options} value="" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Seleccionar...'));

    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(searchInput, { target: { value: 'NP300' } });

    await waitFor(() => expect(screen.getByText('ASM-02')).toBeInTheDocument());

    const clearBtn = screen.getByRole('button');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('ASM-01')).toBeInTheDocument();
    });
  });

  it('accepts and displays a pre-selected value', () => {
    render(<ArchonSelect options={options} value="ASM-02" onChange={mockOnChange} />);
    expect(screen.getByText('ASM-02')).toBeInTheDocument();
  });

  it('normalizes string options to object format', () => {
    render(<ArchonSelect options={['OPT-A', 'OPT-B']} value="" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Seleccionar...'));
    expect(screen.getByText('OPT-A')).toBeInTheDocument();
    expect(screen.getByText('OPT-B')).toBeInTheDocument();
  });

  it('renders with icon prop', () => {
    const FakeIcon = (): React.JSX.Element => <svg data-testid="fake-icon" />;
    render(<ArchonSelect options={options} value="" onChange={mockOnChange} icon={FakeIcon} />);
    expect(screen.getByTestId('fake-icon')).toBeInTheDocument();
  });

  it('closes dropdown when mousedown fires outside the container', async () => {
    render(<ArchonSelect options={options} value="" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Seleccionar...'));
    await waitFor(() => expect(screen.getByText('ASM-01')).toBeInTheDocument());

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Buscar...')).not.toBeInTheDocument();
    });
  });

  it('does not close dropdown when mousedown fires inside the portal root', async () => {
    render(<ArchonSelect options={options} value="" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Seleccionar...'));
    await waitFor(() => expect(screen.getByText('ASM-01')).toBeInTheDocument());

    const portal = document.getElementById('archon-select-portal');
    if (portal) {
      portal.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }

    await waitFor(() => expect(screen.getByText('ASM-01')).toBeInTheDocument());
  });
});
