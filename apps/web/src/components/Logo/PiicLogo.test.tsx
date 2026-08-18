import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/testUtils';
import PiicLogo from './PiicLogo';

/**
 * FC162 F3 (100% mandatorio) — PiicLogo.tsx sin test previo. Componente
 * puramente estático (sin props condicionales de lógica); cubre el render
 * base, el texto de marca y el className opcional.
 */

describe('PiicLogo', () => {
  it('renders the PIIC brand text and the SVG icon', () => {
    const { container } = render(<PiicLogo />);
    expect(screen.getByText('PIIC')).toBeInTheDocument();
    expect(container.querySelector('svg.logo-icon')).not.toBeNull();
  });

  it('falls back to an empty class suffix when className is not provided', () => {
    const { container } = render(<PiicLogo />);
    expect(container.querySelector('.logo')?.className).toBe('logo ');
  });

  it('appends a custom className when provided', () => {
    const { container } = render(<PiicLogo className="footer-logo" />);
    expect(container.querySelector('.logo')?.className).toBe('logo footer-logo');
  });
});
