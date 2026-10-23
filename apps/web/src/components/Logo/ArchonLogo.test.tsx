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
    expect(container.querySelectorAll('svg')).toHaveLength(1);
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

  it('FC219 F2 (S1077): colapsado, el hexágono es la única marca y lleva nombre accesible', () => {
    render(<ArchonLogo isCollapsed />);
    expect(screen.getByRole('img', { name: 'ArchonCore' })).toBeInTheDocument();
  });

  it('FC219 F2 (S1077): expandido, los dos SVG son decorativos porque el texto ya nombra la marca', () => {
    const { container } = render(<ArchonLogo isCollapsed={false} />);
    const svgs = Array.from(container.querySelectorAll('svg'));
    expect(svgs.map((svg) => svg.getAttribute('aria-hidden'))).toEqual(['true', 'true']);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
