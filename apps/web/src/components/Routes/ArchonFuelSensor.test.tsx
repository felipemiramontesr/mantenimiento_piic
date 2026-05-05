import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ArchonFuelSensor from './ArchonFuelSensor';

/**
 * 🔱 Archon QA: ArchonFuelSensor Unit Test
 * Purpose: Validation of linear telemetry gauge and label integrity
 */

describe('ArchonFuelSensor', () => {
  const mockOnChange = vi.fn();

  it('renders minimalist labels (F and E)', () => {
    render(<ArchonFuelSensor value={100} onChange={mockOnChange} />);
    expect(screen.getByText('F')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('renders intermediate scale labels', () => {
    render(<ArchonFuelSensor value={50} onChange={mockOnChange} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('3/4')).toBeInTheDocument();
  });

  it('triggers onChange with correct value when a tick is clicked', () => {
    render(<ArchonFuelSensor value={100} onChange={mockOnChange} />);
    const halfTick = screen.getByTitle('1/2 (50%)');
    fireEvent.click(halfTick);
    expect(mockOnChange).toHaveBeenCalledWith(50);
  });

  it('disables interaction when disabled prop is true', () => {
    render(<ArchonFuelSensor value={100} onChange={mockOnChange} disabled={true} />);
    const halfTick = screen.getByTitle('1/2 (50%)');
    expect(halfTick).toBeDisabled();
  });
});
