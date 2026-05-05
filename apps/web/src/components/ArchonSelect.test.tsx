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
});
