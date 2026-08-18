import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/testUtils';
import ArchonLogo from './ArchonLogo';

/**
 * FC162 F3 (100% mandatorio) — ArchonLogo.tsx sin test previo. Cubre la
 * rama isCollapsed (oculta el texto de marca) y el tamaño por defecto/custom.
 */

describe('ArchonLogo', () => {
  it('renders only the icon (no brand text) when collapsed', () => {
    const { container } = render(<ArchonLogo isCollapsed />);
    expect(screen.queryByText('Archon')).not.toBeInTheDocument();
    expect(container.querySelectorAll('svg').length).toBe(1);
  });

  it('renders the icon plus brand text when expanded', () => {
    render(<ArchonLogo isCollapsed={false} />);
    expect(screen.getByText('Archon')).toBeInTheDocument();
    expect(screen.getByText('Core')).toBeInTheDocument();
  });

  it('uses the default size of 44 when size is not provided', () => {
    const { container } = render(<ArchonLogo isCollapsed />);
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('44');
  });

  it('honors a custom size', () => {
    const { container } = render(<ArchonLogo isCollapsed size={80} />);
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('80');
  });
});
