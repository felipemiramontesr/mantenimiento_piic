/** @vitest-environment jsdom */
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
    color: '#f97316', // rgb(249, 115, 22)
  };

  it('calculates liters correctly (50% of 80L = 40L)', () => {
    render(<FuelVolumeChart {...defaultProps} />);
    expect(screen.getByText('40')).toBeDefined();
    expect(screen.getByText(/Litros/i)).toBeDefined();
  });

  it('calculates remaining capacity correctly', () => {
    render(<FuelVolumeChart {...defaultProps} />);
    expect(screen.getAllByText(/Total Tanque:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/80/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/40/i).length).toBeGreaterThan(0);
  });

  it('renders SVG components with fixed dimensions', () => {
    const { container } = render(<FuelVolumeChart {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('80');
    expect(svg?.getAttribute('height')).toBe('80');
  });

  it('applies the correct status color to the progress bar', () => {
    const { container } = render(<FuelVolumeChart {...defaultProps} />);
    const progressBar = container.querySelector('.h-full') as HTMLElement;
    // JSDOM and Vitest often return RGB for style colors
    expect(progressBar?.style.backgroundColor).toMatch(/rgb\(249,\s*115,\s*22\)/);
  });
});
