import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FuelVolumeChart from './FuelVolumeChart';

/**
 * 🔱 Archon QA: FuelVolumeChart Unit Test
 * Purpose: Validation of circular volumetric rendering and metric calculations
 */

describe('FuelVolumeChart', () => {
  const defaultProps = {
    currentLevel: 50,
    totalCapacity: 80,
    color: '#f97316',
  };

  it('calculates liters correctly (50% of 80L = 40L)', () => {
    render(<FuelVolumeChart {...defaultProps} />);
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('Litros')).toBeInTheDocument();
  });

  it('calculates remaining capacity correctly', () => {
    render(<FuelVolumeChart {...defaultProps} />);
    expect(screen.getByText('Total Tanque:')).toBeInTheDocument();
    expect(screen.getByText('80L')).toBeInTheDocument();
    expect(screen.getByText('-40L')).toBeInTheDocument();
  });

  it('renders SVG components with fixed dimensions', () => {
    const { container } = render(<FuelVolumeChart {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '64');
    expect(svg).toHaveAttribute('height', '64');
  });

  it('applies the correct status color to the progress bar', () => {
    const { container } = render(<FuelVolumeChart {...defaultProps} />);
    const progressBar = container.querySelector('.h-full');
    expect(progressBar).toHaveStyle({ backgroundColor: '#f97316' });
  });
});
